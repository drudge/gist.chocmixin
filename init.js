/*!
 * Gist mixin for Chocolat
 * Copyright(c) 2012 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Gister = require('gister')
  , keychain = require('keychain');

/**
 * Service info.
 */

var service = 'Chocolat Gist Plugin'
  , credentials = {}
  , self = this;

/**
 * Create a public Gist from the current document.
 *
 * @api public
 */

function publicGistCurrentDocument() {    
  if (!credentials.username || !credentials.password) {
    showLoginWindow(publicGistCurrentDocument);
    return;
  }

  var gist = new Gister({username: credentials.username, password: credentials.password })
    , doc = Document.current()
    , file = doc.filename()
    , payload = {};
  
  file = file || 'untitled';
  payload[file] = doc.text;
  
  gist.create(payload);
  
  gist.on('created', function (d) {
    d = d || {};
    url = d.html_url;
    
    if (url) {
      Clipboard.copy(url);
      Alert.show('Gist created', url, [ 'OK']);
    }
  });
}

/**
 * Create a public Gist from the currently selected documents.
 *
 * @api public
 */

function publicGistSelectedDocuments() {    
  if (!credentials.username || !credentials.password) {
    showLoginWindow(publicGistSelectedDocuments);
    return;
  }
  
  var gist = new Gister({username: credentials.username, password: credentials.password })
    , mainWindow = MainWindow.current()
    , currentTab = (mainWindow ? mainWindow.currentTab() : null);
  
  if (currentTab) {
    var docs = currentTab.visibleDocuments() || []
      , payload = {}
      , file;
    
    docs.forEach(function(doc) {
      file = doc.filename() || 'untitled';
      payload[file] = doc.text;
    })
    
    gist.create(payload);
    
    gist.on('created', function (d) {
      d = d || {};
      url = d.html_url;
      
      if (url) {
        Clipboard.copy(url);
        Alert.show('Gist created', url, [ 'OK']);
      }
    });
  }
}

/**
 * Hook up menu items.
 */

Hooks.addMenuItem('Actions/Gist/Public Gist Current Document', 'control-shift-g', publicGistCurrentDocument);
Hooks.addMenuItem('Actions/Gist/Public Gist Selected Documents', 'command-control-shift-g', publicGistSelectedDocuments);

/**
 * Show the gist login window.
 *
 * @api public
 */

function showLoginWindow(fn) {
  var win = new Window();
  
  win.title = 'Login to Gist';
  win.useDefaultCSS = false;
  win.htmlPath = 'login.html';
  win.buttons = [ 'Login', 'Cancel' ];
  win.setFrame({x: 0, y: 0, width: 259, height: 211}, true);
  
  win.onLoad = function() {
    win.applyFunction(function (data) {
      document.getElementById('username').focus();
    }, []);
  };
  
  win.onButtonClick = function(title) {
    if (title == 'Cancel') {
      win.close();
      return;
    }
    
    var user = win.evalExpr('document.getElementById("username").value || ""')
      , pass = win.evalExpr('document.getElementById("password").value || ""')
      , opts = { account: user, password: pass, service: service };
    
    if (!user || !pass) {
      Alert.show('Could not save your credentials.', 'Please fill in your username and password.', ['OK']);
      return;
    }
    
    keychain.setPassword(opts, function(err) {
      if (err) {
        Alert.show('Could not save your credentials.', err.message, ['OK']);
        return;
      }
      
      credentials.username = user;
      credentials.password = pass;
      
      win.close();
      
      if (typeof fn !== 'undefined') {
        fn.call(self);
      }
    });
  };
  
  win.run();
}