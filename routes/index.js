// app/routes.js
module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        var user = null;
        if(req.isAuthenticated()){
          user = req.user;
        }
        res.render('index.ejs', { title: "TKE-ZM", userX: user}); // load the index.ejs file
    });

    // =====================================
    // FACEBOOK ROUTES =====================
    // =====================================
    // route for facebook authentication and login
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

    // handle the callback after facebook has authenticated the user
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/profile',
            failureRedirect : '/'
        }));

        app.get('/unlink/facebook', function(req, res) {
            var user            = req.user;
            user.facebook.token = undefined;
            user.facebook.name = undefined;
            user.facebook.id = undefined;
            if(!user.local.email){
              //Delete the User
              var User = require('../model/user');
              User.findByIdAndRemove(user._id, function(err){
                if(err){
                  res.status(500);
                }
                res.redirect('/');
              });
            }else{
              user.save(function(err) {
                  res.redirect('/profile');
              });
            }
        });

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('profile.ejs', {
            userX : req.user, // get the user out of session and pass to template,
            title: 'TKE-ZM Accounts'
        });
    });

    app.get('/admin',isAdmin, function(req,res) {
      res.render('admin.ejs', {
          title: 'Admin',
          userX: req.user
      });
    });

    app.get('/admin/projects', isAdmin, function(req,res) {
      var projects = [];
      var Project = require('../model/project');
      Project.find({}).sort({date: 'descending'}).exec(function(err, proj){
        if(err)console.log(err);
        else{
          projects = proj;
        }
        res.render('admin_projects.ejs', {
          title: 'Admin - Projects',
          userX: req.user,
          projects: projects
        });
      });
    });

    app.get('/admin/projects/:id', isAdmin, function(req,res) {
      var Project = require('../model/project');
      Project.findById(req.params.id,function(err, proj){
        if(err){
          res.redirect('/admin/projects');
          console.log(err);
        }else if(!proj){
          res.redirect('/admin/projects');
        }
        else{
          res.render('admin_edit_project.ejs', {
            title: 'Admin - Edit Project '+proj.name,
            userX: req.user,
            project: proj
          });
        }
      });
    });

    app.post('/admin/projects/:id', isAdmin, function(req,res) {
      var Project = require('../model/project');
      Project.findById(req.params.id,function(err, proj){
        if(err){
          res.redirect('/admin/projects');
          console.log(err);
        }else if(!proj){
          res.redirect('/admin/projects');
        }
        else{
          if(req.body.name){
            proj.name = req.body.name;
          }
          if(req.body.contact_name && req.body.contact_email){
            proj.contact = {name: req.body.contact_name, email: req.body.contact_email};
          }
          if(req.body.timeframe){
            proj.timeframe = req.body.timeframe;
          }
          if(req.body.photo){
            proj.photo = req.body.photo;
          }
          if(req.body.description){
            proj.description = req.body.description;
          }
          proj.save(function(err){
            if(err)console.log(err);
          });
          res.redirect('/admin/projects');
        }
      });
    });

    app.delete('/admin/projects/:id', isAdmin, function(req,res) {
      if(req.params.id){
        var Project = require('../model/project');
        Project.findByIdAndRemove(req.params.id, function(err){
          if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
          }else{
            res.send('OK');
          }
        });
      }else{
        res.status(404).send('Error. Event Doesn\'t Exist');
      }
    });

    app.get('/admin/events', isAdmin, function(req, res){
      var Event = require('../model/event');
      Event.find({}).sort({date:'descending'}).exec(function(err, events){
          if(err){
            res.status(500);
            res.render('admin_events.ejs',{error: 'Internal Server Error',
            title: 'Admin - Events',
          userX: req.user, events:[]});
          }else{
            res.render('admin_events.ejs',{
            title: 'Admin - Events',
          userX: req.user, events: events});
          }
      });
    });

    app.get('/admin/events/:id', isAdmin, function(req, res){
      if(!req.params.id){
        res.redirect('/admin/projects');
      }else{
        var Event = require('../model/event');

        Event.findOne({ _id:req.params.id }, function(err, event){
            if(err){
              res.status(500);
              res.send('Internal Server Error');
            }else{
              res.render('admin_edit_event.ejs', {
                title: 'Admin - Edit Event '+event.name,
                userX: req.user,
                event: event
              });
            }
        });
      }
    });

    app.post('/admin/events/:id', isAdmin, function(req,res) {
      var Event = require('../model/event');
      Event.findById(req.params.id,function(err, event){
        if(err){
          res.redirect('/admin/event');
          console.log(err);
        }else if(!event){
          res.redirect('/admin/event');
        }
        else{
          if(req.body.name){
            event.name = req.body.name;
          }
          if(req.body.photo){
            event.photo = req.body.photo;
          }
          if(req.body.article){
            event.article = req.body.article;
          }
          event.save(function(err){
            if(err)console.log(err);
          });
          res.redirect('/admin/events');
        }
      });
    });

    app.get('/admin/create_event', isAdmin, function(req,res) {
      res.render('admin_create_event.ejs', {
        title: 'Admin - Create Event',
        userX: req.user
      });
    });

    app.post('/admin/events', isAdmin, function(req,res){
      var Event = require('../model/event');
      if(!req.body.name ||
        !req.body.article ||
        !req.body.photo){
          res.status(403).send('Invalid Parameters');
      }else{
        var newEvent = Event({
          name: req.body.name,
          article: req.body.article,
          photo: req.body.photo
        });
        newEvent.save(function(err){
          if(err){
            res.status(500).send('Internal Server Error');
          }else{
            res.redirect('/admin/events');
          }
        })
      }
    });

    app.delete('/admin/events/:id', isAdmin, function(req,res) {
      if(req.params.id){
        var Project = require('../model/event');
        Project.findByIdAndRemove(req.params.id, function(err){
          if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
          }else{
            res.send('OK');
          }
        });
      }else{
        res.status(404).send('Error. Event Doesn\'t Exist');
      }
    });

    app.post('/admin/projects', isAdmin, function(req,res) {
      var Project = require('../model/project');
      if(!req.body.name ||
        !req.body.description ||
        !req.body.contact_name ||
        !req.body.contact_email ||
        !req.body.photo){
          res.redirect('/admin/projects');
        }else{
          var newProject = Project({
            name : req.body.name,
            contact: {name: req.body.contact_name, email: req.body.contact_email},
            photo : req.body.photo,
            description: req.body.description,
            updates: []
          });
          newProject.save(function(err){
            if(err)console.log(err);
            else{
              console.log(newProject);
            }
          });
          res.redirect('/admin/projects');
        }
    });

    app.get('/admin/create_project', isAdmin, function(req,res) {
      res.render('admin_create_project.ejs', {
        title: 'Admin - Create Project',
        userX: req.user
      });
    });

    app.get('/admin/users', isAdmin, function(req,res) {
      var Users = require('../model/user');
      var usersX = [];
      Users.find({}, function(err, userz) {
        if(err) {
          throw err;
        }
        usersX = userz;
        console.log(usersX);
        res.render('admin_users.ejs', {
          title: 'Admin - Users',
          userX: req.user,
          users: usersX
        });
      });
    });

    app.get('/admin/users/:id', isAdmin, function(req,res) {
      var Users = require('../model/user');
      Users.findOne({ _id:req.params.id }, function(err, user) {
        if(err) {
          res.redirect('/admin/users');
        }
        res.render('admin_user.ejs', {
          title: 'Admin - Users',
          userX: req.user,
          user: user
        });
      });
    });

    app.post('/admin/users/:id', isAdmin, function(req,res) {
        var Users = require('../model/user');
        Users.findById(req.params.id, function(err, user) {
          if(err) {
            res.redirect('/admin/users');
          }
          console.log(req.body.access_level);
          if(req.body.access_level == 1){
            user.level = 'user';
          }else if(req.body.access_level == 2){
            user.level = 'content_manager';
          }else if(req.body.access_level == 3){
            user.level = 'admin';
          }

          user.save(function(err){
            if(err){

            }
            console.log("user saved");
          });
          res.redirect('/admin/users');
        });
    });

    app.get('/admin/officers',isAdmin, function(req,res) {
      // grab the user model
      var Officer = require('../model/officer');
      var officers = [];
      Officer.find({}, function(err, users) {
        if (err || (users.length <= 1)){
          // create a new user
          var newPrytanis = Officer({
            name:"Julian Dano",
            position:"Prytanis",
            photo:"/images/skulian.jpg",
            email:"jbdano@wpi.edu",
            bio:"Our fearless leader. Industrial Engineering Major in the Class of 2016. After his retirement from track, Julian has been involve in many organizations on campus."
          });
          // save the user
          newPrytanis.save(function(err) {
            if (err) throw err;
            console.log('User created!');
          });
          officers.push(newPrytanis);

          var newEpi = Officer({name:"Derek Porter", position:"Epiprytanis", photo:"/images/strong_family.bmp", email:"djporter@wpi.edu",bio:"A fine young Aerospace Engineer who is involved in many activities on campus such as Colleges Against Cancer. In his free time he loves to fish. Ladies, single."});
          // save the user
          newEpi.save(function(err) {
            if (err) throw err;
            console.log('User created!');
          });
          officers.push(newEpi);

          var newCryso = Officer({name:"Henry Gruenbaum", position:"Crysopholos", imgSrc:"/images/gmd.jpg", email:"jhgruenbaum@wpi.edu",bio:"Successful Mechanical Engineering Major from California. Worked for Boeing last summer on the 787. Plans on continuing working in the aerospace industry. "});
          // save the user
          newCryso.save(function(err) {
            if (err) throw err;
            console.log('User created!');
          });
          officers.push(newCryso);
          users = officers;
        }
        res.render('admin_officers.ejs', {
            title: 'Admin - Officers',
            officers: users,
            userX: req.user
        });
      });
      console.log(officers);

    });
    //Render a Single Officer
    app.get('/admin/officers/:title', isAdmin, function(req,res){
      var Officer = require('../model/officer');
      if(!req.params.title){
        res.redirect('/admin/officers');
      }
      var lookupString = req.params.title.charAt(0).toUpperCase() + req.params.title.slice(1).toLowerCase();
      //Find an Officer
      Officer.findOne({ position: lookupString }, function(err, officer){
        if(err){
          res.redirect('/admin/officers');
          console.log("Could not find Officer: " + lookupString);
        }
        res.render('admin_edit_officer.ejs', {
          title: 'Admin - Edit ' + lookupString,
          officer: officer,
          userX: req.user
        });
      });
    });

    app.post('/admin/officers/:title', isAdmin, function(req,res){
      var Officer = require('../model/officer');
      if(!req.params.title){
        res.redirect('/admin/officers');
      }
      var lookupString = req.params.title.charAt(0).toUpperCase() + req.params.title.slice(1).toLowerCase();
      //Find an Officer
      Officer.findOne({ position: lookupString }, function(err, officer){
        if(err){
          res.redirect('/admin/officers');
          console.log("Could not find Officer: " + lookupString);
        }
        if(req.body.name){
          officer.name = req.body.name;
        }
        if(req.body.bio){
          officer.bio = req.body.bio;
        }
        if(req.body.photo){
          officer.photo = req.body.photo;
        }
        officer.save(function(err){
          if(err)console.log(err);
        });
        res.redirect('/admin/officers');
      });
    });
    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { title: "TKE-ZM Login", message: req.flash('loginMessage')});
    });

    // process the login form
    // app.post('/login', do all our passport stuff here);
    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));
    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { title: "TKE-ZM Sign-Up", message: req.flash('signupMessage') });
    });

    // process the signup form
    // app.post('/signup', do all our passport stuff here);
    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}

function isAdmin(req, res, next){
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated() && (req.user.level == 'admin'))
      return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}

function isContentManager(req, res, next){
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated() && (req.user.level == 'content_manager'))
      return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}
/*
var express = require('express');
var router = express.Router();



router.get('/', function(req,res) {
  res.render('index', { title: 'TKE-ZM'});
});

module.exports = router;
*/
