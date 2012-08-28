/*!
 * Gist mixin for Chocolat
 * Copyright(c) 2012 Nicholas Penree <nick@penree.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Gister = require('gister')
  , keychain = require('keychain')
  , exec = require('child_process').exec;

/**
 * Service info.
 */

var service = 'Chocolat Gist Plugin'
  , credentials = {}
  , self = this;

/*
 * Copy URL to clipboard and notify the user.
 */

function handleGistURL(url, isPublic) {
  pubStr = (typeof isPublic === true) ? 'Public' : 'Private';
  
  if (!url) return;
  
  Clipboard.copy(url);
  
  if (typeof Alert.notify !== 'undefined') {
    Alert.notify({
      title: pubStr + " Gist Created",
      subtitle: url,
      body: "The URL has been copied to your clipboard.",
      button: "Show",
      callback: function () {
        exec('/usr/bin/open "' + url + '"', function(err, stdout, stderr) {});
      }
    });
  } else {
    Alert.show(pubStr + ' Gist Created', url, ['OK']);
  }
}

/**
 * Create a new gist with the given `options`.
 */

function createGist(options) {
  var isPublic = (typeof options.pub !== 'undefined') ? options.pub : true;
  var docs = options.docs || [];
  options.cb = options.cb || function() {};
  
  if (!credentials.username) {
    showLoginWindow(options.cb);
    return;
  }
  
  keychain.getPassword({ account: credentials.username, service: service }, function(err, pass) {
    if (pass) {
      credentials.password = pass;
    }
    
    if (!credentials.password) {
      showLoginWindow(options.cb);
      return;
    }
    
    var gist = new Gister({username: credentials.username, password: credentials.password })
      , payload = { "public": isPublic, files: {}, description: '' }
      , file;
      
    docs.forEach(function(doc) {
      file = doc.isUntitled() ? 'untitled' : doc.filename()
      
      if(doc.text) {
        payload.files[file] = { content: doc.text };
      }
    });
    
    var count = Object.keys(payload.files).length;
    
    if (!count) {
      Alert.beep();
      return;
    }
    
    gist.create(payload);
    
    gist.on('created', function (d) {
      d = d || {};
      url = d.html_url;
      
      if (url) {
        handleGistURL(url, isPublic);
      }
    });
  });
}

/**
 * Create a public Gist from the current document.
 *
 * @api public
 */

function publicGistCurrentDocument() {
  var doc = Document.current();
  
  if (!doc) {
    Alert.beep();
    return;
  }
  
  createGist({
    pub: true,
    docs: [ doc ],
    cb: publicGistCurrentDocument
  });
}


/**
 * Create a private Gist from the current document.
 *
 * @api public
 */

function privateGistCurrentDocument() {
  var doc = Document.current();
  
  if (!doc) {
    Alert.beep();
    return;
  }
  
  createGist({
    pub: false,
    docs: [ doc ],
    cb: privateGistCurrentDocument
  });
}

/**
 * Create a public Gist from the currently selected documents.
 *
 * @api public
 */

function publicGistSelectedDocuments() {
  var mainWindow = MainWindow.current()
    , currentTab = (mainWindow ? mainWindow.currentTab() : null)
    , docs;
  
  if (!currentTab) {
    Alert.beep();
    return;
  }
  
  docs = currentTab.visibleDocuments() || [];
  
  createGist({
    pub: true,
    docs: docs,
    cb: publicGistSelectedDocuments
  });
}

/**
 * Create a private Gist from the currently selected documents.
 *
 * @api public
 */

function privateGistSelectedDocuments() {
  var mainWindow = MainWindow.current()
    , currentTab = (mainWindow ? mainWindow.currentTab() : null)
    , docs;

  if (!currentTab) {
    Alert.beep();
    return;
  }

  docs = currentTab.visibleDocuments() || [];

  createGist({
    pub: false,
    docs: docs,
    cb: privateGistSelectedDocuments
  });
}

/**
 * Create a public Gist from the currently active documents.
 *
 * @api public
 */

function publicGistActiveDocuments() {
  var mainWindow = MainWindow.current()
    , currentTab = (mainWindow ? mainWindow.currentTab() : null)
    , docs;

  if (!currentTab) {
    Alert.beep();
    return;
  }

  docs = currentTab.activeDocuments() || [];

  createGist({
    pub: true,
    docs: docs,
    cb: publicGistActiveDocuments
  });
}

/**
 * Create a private Gist from the currently active documents.
 *
 * @api public
 */

function privateGistActiveDocuments() {
  var mainWindow = MainWindow.current()
    , currentTab = (mainWindow ? mainWindow.currentTab() : null)
    , docs;

  if (!currentTab) {
    Alert.beep();
    return;
  }

  docs = currentTab.activeDocuments() || [];

  createGist({
    pub: false,
    docs: docs,
    cb: privateGistActiveDocuments
  });
}

/**
 * Pull out github username if possible.
 */
credentials.username = Storage.persistent().get('githubUsername');

/**
 * Hook up menu items.
 */

Hooks.addMenuItem('Actions/Gist/Public Gist Current Document', 'control-shift-g', publicGistCurrentDocument);
Hooks.addMenuItem('Actions/Gist/Private Gist Current Document', 'control-option-shift-g', privateGistCurrentDocument);
Hooks.addMenuItem('Actions/Gist/Public Gist Selected Documents', 'command-control-shift-g', publicGistSelectedDocuments);
Hooks.addMenuItem('Actions/Gist/Private Gist Selected Documents', 'command-option-control-shift-g', privateGistSelectedDocuments);
Hooks.addMenuItem('Actions/Gist/Public Gist Active Documents', 'command-control-shift-a', publicGistActiveDocuments);
Hooks.addMenuItem('Actions/Gist/Private Gist Active Documents', 'command-option-control-shift-a', privateGistActiveDocuments);

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
      if (data) {
        document.getElementById('username').value = data;
        document.getElementById('password').focus();
      } else {
        document.getElementById('username').focus();
      }
      
      window.passwordKeyPress = function(e) {
        if (typeof e == 'undefined' && window.event) { e = window.event; }
        if (e.keyCode == 13) {
          chocolat.sendMessage('clickLoginButton', []);
        }
      }
    }, [credentials.username]);
  };
  win.onMessage = function (name, args) {
    if (name === 'clickLoginButton') {
      win.onButtonClick('Login');
    }
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
    
    Storage.persistent().set('githubUsername', user);
    
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