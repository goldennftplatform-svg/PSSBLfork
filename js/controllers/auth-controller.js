app.controller("authController", ["$scope", "authFactory", "dataFactory", "$location", "$route", "$routeParams", function ($scope, authFactory, dataFactory, $location, $route, $routeParams) {

    Utilities.log("Loading authController");
    $scope.controllerName = "authController" // for debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    var REFRESH_INTERVAL = 600000;    // server connection refresh interval in milliseconds

    // Handles ... Login Menu, Login Page, Registration Page,
    // Register Page, Profile Page, Draft Manager
    $scope.login = authFactory.login;
    $scope.registration = authFactory.registration;
    $scope.registerForm = authFactory.registerForm;
    $scope.profile = authFactory.profile;
    $scope.preferences = authFactory.preferences;
 
    // Link to season-dependent constants
    $scope.season = dataFactory.season;
    var season = dataFactory.season;
    $scope.currentYear = season.currentYear;

    // Can get here from multiple links ... depending on the path, some
    // initialization may be required
    var page = "header";    // default if no specific page selected
    if ($location.path().search("/registration") >= 0) page = "registration";
    if ($location.path().search("/register") >= 0) page = "register";
    if ($location.path().search("/dayLeague") >= 0) page = "dayLeague";
    if ($location.path().search("/event") >= 0) page = "event";
    if ($location.path().search("/login") >= 0) page = "login";
    if ($location.path().search("/profile") >= 0) page = "profile";
    if ($location.path().search("/draft/manager") >= 0) page = "draftManager";
    if ($location.path().search("/waiver") >= 0) page = "waiver";
    // signin is the same as login except a start page is passed as well
    if ($location.path().search("/signin/") >= 0) page = "login";

    // === Initialization for registration page ===
    $scope.registrationEventsLoaded = false;

    var iconMap = {
        "registered": "fa-check-circle",
        "late_registration": "fa-exclamation-triangle",
        "team_join": "fa-users",
        "new_player": "fa-user",
        "player_pool": "fa-list-alt",
        "taxi_pool": "fa-taxi",
        "waiver": "fa-pencil",
        "status_change": "fa-arrow-circle-up",
        "payment": "fa-money",
        "deduction": "fa-money",
        "fee": "fa-exclamation-triangle"
    }

    // === Initialization for profile page ===
    // Have to be logged in, or bounce this
    if (page == "profile") {
        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
        }

        // Everything should be moved to object $scope.profile - TODO
        $scope.profile = {};
 
        // Must have permission to access this. Currently can only get here
        // as logged in user, so extraneous for now. Admin access will be added later
        if (!authFactory.hasPermission("user", authFactory.login.userId, "Administrator")) {
            $location.path("/message/not-authorized");
        }
        authFactory.getProfile($scope, authFactory.login.userId);
        authFactory.getPreferences($scope, authFactory.login.userId);

        // permission functions will pass through to authFactory
        $scope.getPermissionScope = authFactory.getPermissionScope;
        $scope.getPermissionList = authFactory.getPermissionList;

        $scope.canAdministerTryouts = function () {
            // Calculate the PIN number
            $scope.pinNumber = 3456 ^ authFactory.login.userId;
            return authFactory.hasPermission("competition", authFactory.login.userId, "Treasurer");
        }
    }

    $scope.getPrefValue = function (key) {
        var value = $scope.preferences[key];
        return value;
    }

    // These functions are very similar to ones found in admin-controller
    // Some future clean-up might be in order
    $scope.cancelEdit = function () {
        authFactory.getProfile($scope, authFactory.login.userId);
        $scope.profile.canEdit = false;
    }

    $scope.saveProfile = function () {
        // Must pass along player Id
        var profile = $scope.profile;
        profile.user_id = authFactory.login.userId;
        authFactory.saveProfile($scope, profile);
        // TODO: Confirmation message and reload profile
        $scope.profile.canEdit = false;
    }

    $scope.savePreferences = function () {
        // Must pass along player Id
        $scope.preferences.user_id = authFactory.login.userId;
        authFactory.savePreferences($scope, $scope.preferences);
    }

    $scope.changePassword = function () {
        $location.path("/login/" + $scope.profile.email + "/RequestReset");
    }

    if (page == "registration") {
        // For testing purposes, we will allow year and id to be passed in - TODO disable for release
        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
        }
        $scope.registration.year = $routeParams.year;
        $scope.registration.userId = $routeParams.playerId;
        $scope.registration.userName = undefined;
        $scope.registration.waiver = false;
        $scope.registration.dayLeague = {};
        $scope.registration.dayLeague.disabled = false;
        $scope.registration.dayLeague.updated = false;
        // Clear billing info and don't show yet
        authFactory.billing = {};
        authFactory.billing.showPay = false;
        authFactory.billing.creditPrepared = false;
        if ($scope.registration.userId) {
            if (authFactory.hasPermission("user", $scope.registration.userId, "Administrator")) {
                authFactory.getPlayerName($scope.registration, $scope.registration.userId);
            } else {
                $location.path("/message/not-authorized");
            }
        } else {
            // But what we normally do is get this from the session data
            $scope.registration.year = authFactory.login.year;
            $scope.registration.userId = authFactory.login.userId;
            $scope.registration.userName = authFactory.login.userName;
        }

        // Get registration events and team list
        if ($scope.registration.year && $scope.registration.userId) {
            authFactory.getRegistrationEvents($scope, $scope.registration.year, $scope.registration.userId);
            authFactory.getTeamList($scope.registration, $scope.registration.year, $scope.registration.userId);
            authFactory.getTaxiInfo($scope.registration, $scope.registration.year, $scope.registration.userId);
            authFactory.getFreeAgentInfo($scope.registration, $scope.registration.year, $scope.registration.userId);
            authFactory.getDayLeagueInfo($scope.registration, $scope.registration.year, $scope.registration.userId);
        } else {
            // TODO process as navigation error - maybe a different message?
            $location.path("/message/not-authorized");
        }

        $scope.registration.canChangeStatus = function (team) {
            if ($scope.registration.year != season.currentYear) return false;
            if (team.roster_status != "Inactive") return false;
            return true;
        }

        $scope.registration.changeStatus = function (team) {
            authFactory.changeStatus($scope.registration, $scope.registration.userId, team.team_id);
            $scope.registration.changeTeam = team;
        }

        $scope.registration.joinTaxi = function () {
            $scope.registration.taxiChange = {};
            var taxiForm = {};
            taxiForm.userId = $scope.login.userId;
            taxiForm.year = $scope.login.year;
            GetTaxiOptions(taxiForm, $scope.registration.taxiForm);   // Identify source
            authFactory.joinTaxi($scope.registration, taxiForm)
        }

        $scope.registration.leaveTaxi = function () {
            $scope.registration.taxiChange = {};
            authFactory.leaveTaxi($scope.registration, $scope.registration.userId)
        }

        $scope.registration.registerDayLeague = function () {
          // Disable registration button to prevent double clicks
          $scope.registration.dayLeague.disabled = true;
          authFactory.registerDayLeague($scope.registration, $scope.registration.userId);
        };
        $scope.registration.showWaiver = function () {
            $location.path("/waiver/registration");
        }

        $scope.registration.canRegister = function () {
            if ($scope.registration.year == $scope.currentYear) {
                if ($scope.registration.events && $scope.registration.events.length == 0) {
                    authFactory.registerForm.OkToRegister = true;
                    return true;
                }
            }
            return false;
        }

        $scope.registration.isCurrentYear = function () {
            if ($scope.registration.year == authFactory.login.year) return true;
            return false;
        }
        
        $scope.registration.isCurrentDraft = function () {
            if ($scope.registration.year != dataFactory.season.currentYear) return false;
            var currentDate = new Date();
            if (currentDate > dataFactory.season.draftDate) return false;
            return true;
        }
   
        $scope.registration.isFreeAgent = function () {
            if ($scope.registration.freeAgent && $scope.registration.freeAgent.joined == "1") return true;
            return false;
        }

        $scope.registration.isTaxiPlayer = function () {
            if ($scope.registration.taxi && $scope.registration.taxi.joined == "1") return true;
            return false;
        }

        $scope.registration.waiverNeeded = function () {
            if ($scope.registration.canRegister()) return false;
            if ($scope.registration.waiver) return false;
            return true;
        }

        $scope.registration.hasGear = function () {
            if ($scope.registration.taxi && $scope.registration.taxi.gear == "1") return true;
            return false;
        }

        $scope.registration.taxiPositions = function () {
            if ($scope.registration.taxi && ($scope.registration.taxi.joined == "1")) {
                var bitString = $scope.registration.taxi.positions;
                posList = "";
                if (bitString.charAt(0) == "1") posList += "P ";
                if (bitString.charAt(1) == "1") posList += "C ";
                if (bitString.charAt(2) == "1") posList += "1B ";
                if (bitString.charAt(3) == "1") posList += "2B ";
                if (bitString.charAt(4) == "1") posList += "3B ";
                if (bitString.charAt(5) == "1") posList += "SS ";
                if (bitString.charAt(6) == "1") posList += "LF ";
                if (bitString.charAt(7) == "1") posList += "CF ";
                if (bitString.charAt(8) == "1") posList += "RF ";
                return posList.trim();
            }
            return "?";
        };
      $scope.registration.isDayLeagueEligible = function () {
        // If registered, assume eligible
        if ($scope.registration.dayLeague.registered) return true;
        // Otherwise, check age
        if ($scope.registration.dayLeague.dob) {
          var dob = new Date($scope.registration.dayLeague.dob);
          var today = new Date();
          var age = today.getFullYear() - dob.getFullYear();
          if (age >= 65) return true;
        }
        return false;
      };
      
      // Activate a watch function for when the registerDayLeague result is returned
      $scope.$watch("registration.dayLeague.updated", function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // Reload page
            $route.reload();
        }
      });

        // Activate a watch function for when the changeStatus result is returned
        $scope.$watch('registration.statusResult', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.registration.statusResult.result == "success") {
                    // Reload page
                    $route.reload();
                } else {
                    $scope.registration.changeTeam.error = $scope.registration.statusResult.error;
                }
            }
        });

        // Activate a watch function for when a taxi pool status change function returns
        $scope.$watch('registration.taxiChange.result', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.registration.taxiChange.result == "success") {
                    // Reload page
                    $scope.registration.joiningTaxi = false;
                    $route.reload();
                } else {
                    if (!$scope.registration.taxiChange.error) {
                        $scope.registration.taxiChange.error = "Unknown Error";
                    }
                }
            }
        });

        // Activate a watch function for when getRegistrationEvents returns
        // Checking to see if waiver needs to be re-signed
        $scope.$watch('registrationEventsLoaded', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                var waiver = false;
                for (var iEvent = 0; iEvent < $scope.registration.events.length; iEvent++) {
                    var event = $scope.registration.events[iEvent];
                    if (event.type == "waiver") {
                        $scope.registration.waiver = true;
                    }
                }
            }
        });
    }

    // Referenced both on registration.html and signup.html - REVIEW
    $scope.isCurrentDraft = function () {
        if ($scope.registration.year != season.currentYear) return false;
        var currentDate = new Date();
        if (currentDate > dataFactory.draftDate) return false;
        return true;
    }


    // === Initialization for event registration page ===
    // Can get here from player's registration page or admin can get here if authorized and
    // admin specifies playerId in url
    if (page == "event") {
        $scope.event = {};
        $scope.event.page = "Loading";
        $scope.event.competitionId = "18";  // Hard-code competition ID for 2017 Safeco event
        $scope.event.amountDue = 31500;     // Hard-code starting amount
        var exit = false;

        $scope.event.playerId = $routeParams.playerId;
        $scope.event.status = "Unregistered";
        // Must be logged in. $location.path does not execute immediately so disable additional code afterward
        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
            exit = true;
        }
        if (!$scope.event.playerId) $scope.event.playerId = authFactory.login.userId;

        if (!exit && !authFactory.hasPermission("user", $scope.event.playerId, "Treasurer")) {
            $location.path("/message/not-authorized");
            exit = true;
        }
        // Fetch records related to this player and the special event
        $scope.event.registration = {};
        if (!exit) authFactory.getSpecialEvents($scope.event, $scope.event.competitionId, $scope.event.playerId);

        $scope.event.Register = function (withPay) {
            // switch to loading page and submit registration 
            $scope.event.page = "Loading";
            $scope.event.makePayment = withPay;
            $scope.event.registration = {};
            authFactory.eventRegister($scope.event, $scope.event.competitionId, $scope.event.playerId);
        }

        $scope.event.Pay = function () {
            $scope.event.showPay = true;
            authFactory.billing = {};
            authFactory.billing.year = $scope.event.year;
            authFactory.billing.registrationId = $scope.event.registrationId;
            authFactory.billing.amount = $scope.event.amountDue;
            authFactory.billing.onSuccess = "reload";
            authFactory.billing.showPay = true;
            //authFactory.billing.creditPrepared = false;
        }

        // Watch function will look at return result of event registration attempt
        $scope.$watch('event.registerResult', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.event.registerResult.error) {
                    $scope.event.error = $scope.event.registerResult.error;
                    $scope.event.page = "Error";
                } else {
                    $scope.event.page = "Main";
                    $scope.event.status = "Registered";
                    $scope.event.registrationId = $scope.event.registerResult.registrationId;
                    if ($scope.event.makePayment) {
                        $scope.event.Pay();
                    }
                }
            }
        });

        // Watch function will look at registration events to determine current status
        // of event registration for this user
        $scope.$watch('event.eventsResult', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.event.eventsResult.error) {
                    $scope.event.error = $scope.event.eventsResult.error;
                    $scope.event.page = "Error";
                } else {
                    $scope.event.page = "Main";
                    $scope.event.status = "Unregistered";
                    var registered = false;
                    var paid = false;
                    var registerEventId = undefined;
                    //$scope.event.amountDue = 0;
                    for (var iEvent = 0; iEvent < $scope.event.events.length; iEvent++) {
                        var event = $scope.event.events[iEvent];
                        //$scope.event.amountDue += Number(event.amount);
                        if (event.type == "registered") {
                            registered = true;
                            $scope.event.registerEventId = event.id;
                            $scope.event.registrationId = event.registrationId;
                        }
                        if (event.type == "payment") {
                            paid = true;
                        }
                    }
                    if (registered) $scope.event.status = "Registered";
                    if (paid) $scope.event.status = "Paid";
                }
            }
        });
    }

    // === Initialization for waiver page ===
    // Breaking out waiver signing as separate page. Eventually, current references from registration, draft, and free agent pages should probably be folded
    // into this uniform handler. This may require state retention when navigating away from and back to originating page.
    if (page == "waiver") {
        $scope.waiver = {};
        $scope.waiver.fromPage = $routeParams.fromPage;
        $scope.waiver.error = null;
        dataFactory.getArticleHtml($scope, "waiver")

        $scope.waiver.signWaiver = function (signed) {
           $scope.waiver.error = null;
           if (signed) {
                if ($scope.waiver.signature === $scope.login.userName) {
                    // Submit signature event and wait for result
                    authFactory.signWaiver($scope.waiver, $scope.login.userId);
               } else {
                    $scope.waiver.error = "Signature does not match name";
                }
 
            } else {
                $scope.waiver.error = false;
                // Return to refering page with no further action
                // Restoration of state data is responsibility of referring page
                $location.path("/" + $scope.waiver.fromPage);
            }
        }

        // Activate a watch function for when the waiver submission is returned
        $scope.$watch('waiver.result', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.waiver.result.error) {
                    $scope.waiver.error = $scope.waiver.result.error;
                } else {
                    // Return to refering page with no further action
                    // Restoration of state data is responsibility of referring page
                    $location.path("/" + $scope.waiver.fromPage);
                }
            }
        });
    }

    // === Initialization for login page ===
    // Clear email and password initially
    if (page == "login") {
        // Reset login object to avoid carry over from previous login
        $scope.login = {};
        $scope.login.page = "login";
        $scope.login.email = "";
        $scope.login.password = "";
        $scope.login.reset = {};
        $scope.login.reset.email = "";
        $scope.login.ping = {};

        // This could be a link from a password reset mail. If so, handle special case
        $scope.login.reset.token = $routeParams.token;
        $scope.login.reset.email = $routeParams.email;
        if ($scope.login.reset.token && $scope.login.reset.email)
        {
            // Could be directed here from profile page
            if ($scope.login.reset.token == "RequestReset") {
                $scope.login.reset.disabled = true;
                $scope.login.page = "forgot";
            } else {
                $scope.login.page = "reset";
            }
        }

        // It could also be a "signin" which includes a start page specification
        $scope.login.startPage = $routeParams.startPage;
    }

    // === Login page functions ===

    $scope.showLoginPage = function (value) {
        $scope.login.page = value;
    }

    $scope.requestReset = function () {
        authFactory.requestPasswordReset($scope.login.reset, $scope.login.reset.email);
    }

    $scope.resetPassword = function () {
        $scope.login.reset.result = {};
        authFactory.resetPassword($scope.login.reset, $scope.login.reset);
    }

    $scope.log_in = function () {
        $scope.login.showLoginError = false;
        // The result will be passed to $scope.login.loginResult 
        authFactory.log_in($scope.login, $scope.login.email, $scope.login.password);
    }

    $scope.logout = function () {
        authFactory.logout($scope.login);
        $location.path("#");
    }

    $scope.loggedIn = function () {
        $scope.login = authFactory.login;
        return authFactory.login.loggedIn;
    }

    $scope.isAdmin = function () {
        return authFactory.login.isAdmin;
    }

    // Survey token generator
    $scope.surveyToken = function () {
        var seed = authFactory.login.userId.toString() + authFactory.login.userId.toString();
        var token = parseInt(seed) ^ 2098765678;
        return token;
    }

    // Activate a watch function for when the login result is returned
    // TODO: Need to revisit the return code format and improve error handling
    $scope.$watch('login.loginResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.login.loginResult.result == "success") {
                // We may be directed to a start page, but don't assume that it is valid:
                // evaluate on a case by case basis. For now, only registration supported
                if ($scope.login.startPage == "registration") {
                    $location.path("/registration");
                } else {
                    $location.path("#");
                }
                // On successful login, we trigger a recurring keep-alive event to prevent server timeouts
                $scope.login.timeout = setTimeout(RefreshConnect, REFRESH_INTERVAL);
            } else {
                var error = $scope.login.loginResult.error;
                if (error == "InvalidLogin" || error == "InvalidEmail") {
                    $scope.login.error = "Invalid email or password";
                } else {
                    $scope.login.error = error;
                }
            }
        }
        $scope.login.loginResult = null;
    });

    // Activate a watch function for when the password reset is returned
    $scope.$watch('login.reset.result', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.login.reset.result.error) {
                $scope.login.page = "error";
            } else if ($scope.login.reset.complete) {
                $scope.login.page = "success";
            } else {
                $scope.login.page = "message";
            }
        }
        $scope.login.loginResult = null;
    });

    // === functions for register form ===

    if (page == "register") {
        // Must have permission to access this. Furthermore, you can not come here
        // except by clicking the register button on Registration page.
        // TODO: Deal with coming back to waiver after reading docs.
        if (!authFactory.registerForm.OkToRegister ||
            !authFactory.hasPermission("user", authFactory.login.userId, "Administrator")) {
            $location.path("/message/not-authorized");
        }
        authFactory.getDuesInfo($scope.registerForm, $scope.currentYear);
        // It's possible that we are reloading this form after navigating elsewhere. If so, we do not want to reload
        // eligible teams and reset their status. On the other hand, this never gets loaded in many cirucmstatnces, so
        // we change the test to something less sensitive
        if (!$scope.registerForm.visited) {
            authFactory.getEligibleTeams($scope.registerForm, $scope.currentYear, $scope.login.userId);
        }
        authFactory.getDuesBalance($scope.registerForm, $scope.currentYear - 1, $scope.login.userId);
        $scope.RegisterPage = "Loading";
        $scope.registerForm.registerComplete = "";
        $scope.registerForm.signature = "";
        $scope.registerForm.signatureError = false;
        $scope.registerForm.taxi = false;
        $scope.registerForm.taxiOnly = false;
        $scope.registerForm.positions = {};
        $scope.registerForm.objType = "registerForm";
        $scope.registerForm.visited = true;
    }

    // Activate a watch function for when the register result is returned
    $scope.$watch('registerForm.checkRegister', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.registerForm.duesInfo && $scope.registerForm.teams && $scope.registerForm.duesBalance) {
                if ($scope.registerForm.duesInfo.error || $scope.registerForm.duesBalance.error) {   // TODO: need to rethink this
                    $scope.RegisterPage = "Error";
                    $scope.registerForm.errorType = "bad_data";
                } else if ($scope.registerForm.teams.length < 1 && !$scope.registerForm.taxiOnly) {
                    $scope.RegisterPage = "Error";
                    $scope.registerForm.errorType = "no_teams";
                // Not going to block registration over this. TODO: remove call to get duesBalance
                //} else if ($scope.registerForm.duesBalance.balance > 0) {
                //    $scope.RegisterPage = "Error";
                //    $scope.registerForm.errorType = "balance_owed";
                } else {
                    CalculateDues();
                    $scope.RegisterPage = "Main";
                }
            }
        }
    });

    $scope.teamStatus = function (index, status) {
        return ($scope.registerForm.teams[index].status == status);
    }

    $scope.teamSpan = function () {
        return (Number($scope.registerForm.teamCount) + 1);
    }

    $scope.setTeamStatus = function (index, status) {
        $scope.registerForm.teams[index].status = status;
        CalculateDues();
    }

    $scope.setTaxiOnly = function () {
        CalculateDues();
        $scope.registerForm.taxiOnly = true;
        $scope.RegisterPage = "Main";
    }

    $scope.setTaxi = function (setting) {
        $scope.registerForm.taxi = setting;
        CalculateDues();
    }

    $scope.showWaiver = function () {
        $scope.RegisterPage = "Waiver"
        dataFactory.getArticleHtml($scope, "waiver")
    }

    $scope.signWaiver = function (signed) {
        if (signed) {
            if ($scope.registerForm.signature === $scope.login.userName) {
                $scope.registerForm.signatureError = false;
                $scope.registerForm.waiver = true;
                $scope.RegisterPage = "Main";
            } else {
                $scope.registerForm.signatureError = true;
            }
        } else {
            $scope.registerForm.signatureError = false;
            $scope.RegisterPage = "Main";
        }
    }

    $scope.blockRegistration = function (override) {
        if (override) return true;
        // Do not allow registration if any team status is unspecified
        if (!$scope.allTeamsMarked()) return true;
        if ($scope.registerForm.waiver && ($scope.registerForm.totalDues > 0)) return false;
        return true;
    }

    $scope.allTeamsMarked = function () {
        if ($scope.registerForm.teams.length) {
            for (var index = 0; index < $scope.registerForm.teams.length; index++) {
                var team = $scope.registerForm.teams[index];
                if (!team.status) return false;
            }
        }
        return true;
    }

    $scope.testRegister = function () {
        authFactory.getRegistrationEvents($scope, $scope.currentYear, $scope.login.userId);
        $scope.RegisterPage = "Payment";
    }

    $scope.Register = function (withPay) {
        // load up an object to send to server
        var submitForm = {};
        submitForm.userId = $scope.login.userId;
        submitForm.year = $scope.login.year;
        submitForm.taxi = {};
        submitForm.taxi.join = $scope.registerForm.taxi;
        if ($scope.registerForm.taxi) GetTaxiOptions(submitForm.taxi, $scope.registerForm);
        submitForm.teams = [];
        submitForm.status = "inactive";
        for (var i = 0; i < $scope.registerForm.teams.length; i++) {
            var team = {};
            team.teamId = $scope.registerForm.teams[i].team_id;
            team.status = $scope.registerForm.teams[i].status;
            team.number = $scope.registerForm.teams[i].number;
            if (team.status == "active" || team.status == "inactive") {
                if (team.status == "active") submitForm.status = "active";
                submitForm.teams.push(team);
            }
        }
        $scope.registerForm.pay = withPay;
        authFactory.billing = {};
        authFactory.billing.creditPrepared = false;
        authFactory.register($scope.registerForm, submitForm);
        $scope.RegisterPage = "Payment";
    }

    // And set a watch for when the  registration events return
    $scope.$watch('registerForm.registerComplete', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.registerForm.registerComplete == "returned") {
                // Could still be an error
                if ($scope.registerForm.result.error) {
                    $scope.RegisterPage = "Error";
                    $scope.registerForm.errorType = "server_error";
                    $scope.registerForm.errorDetails = $scope.registerForm.result.error;
                } else {
                    // Succeeded - proceed to payment
                    authFactory.getRegistrationEvents($scope, $scope.currentYear, $scope.login.userId);
                }
            } else if ($scope.registerForm.registerComplete == "failed") {
                $scope.RegisterPage = "Error";
                $scope.registerForm.errorType = "server_error";
            }
        }
    });

    // === functions for registration page ===

    // Activate a watch function for when the registration data finishes loading
    $scope.$watch('registrationEventsLoaded', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // Go through events, assign icons and reformat comments to html.
            $scope.registration.amountOwed = 0;
            var registered = false;
            var registeredForDraft = false;
            var registerEventId = undefined;
            authFactory.draft.waiver = false;
            for (var iEvent = 0; iEvent < $scope.registration.events.length; iEvent++) {
                var event = $scope.registration.events[iEvent];
                event.iconClass = iconMap[event.type];
                event.statusClass = event.status;
                event.comment = FormatMarkdown(event.comment);
                $scope.registration.amountOwed += Number(event.amount);
                if (event.type == "player_pool") {
                    registeredForDraft = true;
                    if (!registerEventId) registerEventId = event.id;
                }
                if (event.type == "registered") {
                    registered = true;
                    registerEventId = event.id;
                }
                if (event.type == "waiver") {
                    authFactory.draft.waiver = true;
                }
            }
            authFactory.billing.registerEventId = registerEventId;
            $scope.noDraft = false;
            if (registeredForDraft) {
                $scope.noDraft = true;
                $scope.noDraftReason = "You are already registered for the draft";
            }
            else if (!registered && !registeredForDraft && $scope.registration.teamCount > 0) {
                $scope.noDraft = true;
                $scope.noDraftReason = "Returning players must register for the season before registering for the draft";
            }
            // If this is coming from the registration, proceed to payment
            if (page == "register") {
                PreparePayment();
            }
        }
    });

    $scope.statusClass = function (status) {
        if (status == "Active") return "label-success";
        return "label-default";
    }

    // Admin testing function to step through registrations
    $scope.nextId = function () {
        return Number($scope.registration.userId) + 1;
    }

    // Revise
    $scope.PayDues = function () {
        // Pass in some additional information
        authFactory.billing.year = $scope.registration.year;
        authFactory.billing.registrationId = $scope.registration.taxi.registrationId;
        authFactory.billing.amount = $scope.registration.amountOwed;
        authFactory.billing.onSuccess = "reload";
        authFactory.billing.showPay = true;
    }

    // Local Functions

    function RefreshConnect() {
        // Send a keep alive to the server in regular interval
        if (authFactory.login.loggedIn) {
            // $watch doesn't seem to be firing, so check for failure in here
            if ($scope.login.ping.error) {
                // logout and present timeout screen
                Utilities.log("Session being terminated");
                authFactory.logout($scope.login.ping);
                clearTimeout($scope.login.timeout);
                $location.path("/message/timed-out");
            } else {
                Utilities.log("Keep alive sent to server");
                authFactory.keepAlive($scope.login.ping);
                $scope.login.timeout = setTimeout(RefreshConnect, REFRESH_INTERVAL);
            }
        } else {
            // If not logged in, terminate the loop
            clearTimeout($scope.login.timeout);
        }
    }

    function GetTaxiOptions(taxiObject, form) {
        taxiObject.positions = "";
        taxiObject.positions += form.positions.p ? "1" : "0";
        taxiObject.positions += form.positions.c ? "1" : "0";
        taxiObject.positions += form.positions.b1 ? "1" : "0";
        taxiObject.positions += form.positions.b2 ? "1" : "0";
        taxiObject.positions += form.positions.b3 ? "1" : "0";
        taxiObject.positions += form.positions.ss ? "1" : "0";
        taxiObject.positions += form.positions.lf ? "1" : "0";
        taxiObject.positions += form.positions.cf ? "1" : "0";
        taxiObject.positions += form.positions.rf ? "1" : "0";
        taxiObject.gear = form.gear ? 1 : 0;
        taxiObject.notes = form.notes;
    }

    function CalculateDues() {
        $scope.registerForm.totalDues = 0;
        $scope.registerForm.taxiDues = 0;
        var basePaid = false;
        if ($scope.registerForm.teams.length) {
            for (var index = 0; index < $scope.registerForm.teams.length; index++) {
                var team = $scope.registerForm.teams[index];
                var teamDues = 0;
                // Don't set default to "active". Make everyone set status for all teams before registering
                //if (!team.status) team.status = "active";
                if (!basePaid && (team.status == "active" || team.status == "inactive")) {
                    teamDues = Number($scope.registerForm.duesInfo["base_dues"]);
                    teamDues += Number($scope.registerForm.duesInfo["late_registration_dues"]);
                    basePaid = true;
                }
                if (team.status == "active") {
                    var games = Number($scope.registerForm.duesInfo[team.division_name]);
                    teamDues += games * Number($scope.registerForm.duesInfo["price_per_game"]);
                }
                $scope.registerForm.teams[index].dues = teamDues;
                $scope.registerForm.totalDues += teamDues;
            }
        }
        if ($scope.registerForm.taxi && !basePaid) {
            $scope.registerForm.taxiDues = Number($scope.registerForm.duesInfo["base_dues"]);
            // late registration dues are no longer added to base dues
            //$scope.registerForm.taxiDues += Number($scope.registerForm.duesInfo["late_registration_dues"]);
            $scope.registerForm.totalDues += $scope.registerForm.taxiDues;
        }
    }

    function PreparePayment() {
        // Registration has been submitted and the registration event summary has been returned
        // If payment has been defered, finish up. Otherwise show payment control
        authFactory.billing.showPay = false;    // Need to reset so change can be detected.
        if ($scope.registerForm.pay) {
            authFactory.billing.year = $scope.registration.year;
            authFactory.billing.registrationId = $scope.registerForm.registrationId;
            authFactory.billing.amount = $scope.registration.amountOwed;
            authFactory.billing.onSuccess = "showReg";
            authFactory.billing.showPay = true;
        } else {
            $scope.registerForm.showComplete = true;
        }
    }

    // Registration comments are formatted as Markdown code. We need to convert this to HTML.
    // Newlines in the format are already replaced with "$$" - Actually, not anymore: everything is
    // sent via json_encode.
    function FormatMarkdown(comment) {
        if (comment) {
            return md_to_html(comment);
            /*
            var htmlOut = "";
            // get rid of any double line feeds. TODO: if this is still needed, will have to look for
            // line feeds instead
            comment = Utilities.replace("$$$$", "$$", comment);
            splitComment = comment.split("$$");
            // First line may be formatted as H4; if not, treat as separate paragraph
            if (splitComment[0].search("#### ") >= 0) {
                htmlOut += splitComment[0].replace("#### ", "<H4>") + "</H4>";
            } else {
                htmlOut += "<p>" + splitComment[0] + "</p>";
            }
            if (splitComment.length > 1) {
                htmlOut += "<p>";
                for (var index = 1; index < splitComment.length; index++) {
                    if (index > 1) htmlOut += " ";
                    htmlOut += ReplaceMarkdown(splitComment[index]);
                }
                htmlOut += "</p>";
            }
            return htmlOut;
            */
        }
        return undefined;
    }

    // swap markdown '**' for <strong> and '*' for <em> tags
    function ReplaceMarkdown(text) {
        var outText = text;
        // First do strong markings
        var iCount = 0;
        while (outText.indexOf("**") >= 0) {
            var replaceText = (iCount % 2 == 0) ? "<strong>" : "</strong>";
            outText = Utilities.replace("**", replaceText, outText);
            iCount++;
        }
        // First do strong markings
        iCount = 0;
        while (outText.indexOf("*") >= 0) {
            var replaceText = (iCount % 2 == 0) ? "<em>" : "</em>";
            outText = Utilities.replace("*", replaceText, outText);
            iCount++;
        }
        return outText;
    }
}
]);