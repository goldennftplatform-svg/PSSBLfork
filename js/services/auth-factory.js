app.factory('authFactory', function ($http, $q, dataFactory) {

    var authFactory = {};
    // Config settings are temporarily hard-coded in data-factory.
    var requestBase = dataFactory.authBase;
    var payBase = dataFactory.payBase;
    var supportBase = 'https://pssbl.com/PHP/support.php?';
    var firstYear = dataFactory.season.firstYear;
    var year = dataFactory.season.currentYear;

    // The property "nosend" can be set to true to suppress mail sending during testing *Review*
    authFactory.nosend = false;

    // permissions object is private
    var permissionType = {
        0: "Scheduler",     // mask 1
        1: "Statistician",  // mask 2
        2: "Manager",       // mask 4
        3: "Treasurer",     // mask 8
        4: "Administrator", // mask 16
        5: "Editor"         // mask 32
    }
    var permissionMap = {
        "Scheduler": 0,
        "Statistician": 1,
        "Manager": 2,
        "Treasurer": 3,
        "Administrator": 4,
        "Editor": 5
    }

    // login object holds data on login process and login menu
    // Initialize login data from session if it is there
    authFactory.login = {};
    LoadAuthFromSession();
    authFactory.login.objType = "login";

    // other objects
    authFactory.registration = {};
    authFactory.registerForm = {};
    authFactory.profile = {};
    authFactory.preferences = {};
    authFactory.signup = {};
    authFactory.admin = {};
    authFactory.draft = {};
    authFactory.freeAgent = {};
    authFactory.team = {};
    authFactory.billing = {};

    //===== This is the basic call to submit a query ======
    // probably should consolidate into dataFactory
    authFactory.requestHttp = function (request, base) {
        if (base == null) base = requestBase;
        fullRequest = base + "type=" + request;
        Utilities.log("!dataFactory >> " + fullRequest);
        return $http.get(fullRequest);
    }

    //===== This version uses the post method and passes data in a JSON string ======
    authFactory.requestHttpPost = function (request, dataObject) {
        fullRequest = requestBase + "type=" + request;
        var data = angular.toJson(dataObject);
        Utilities.log("!dataFactory >> " + fullRequest);
        return $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        });
    }

    // Here is a version to return plain text instead of JSON
    authFactory.requestText = function (request, base) {
        if (base == null) base = requestBase;
        fullRequest = base + "type=" + request;
        return $http({
            url: fullRequest,
            method: 'GET',
            transformResponse: function rawText(data, hdrGetter) {
                return data;
            }
        });
    }

    // TODO merge with dataFactory
    authFactory.reportError = function (source, response) {
        Utilities.log("!!! http error calling " + source + ": " + response.status + " = " + response.statusText + ", message = " + response.message);
    }


    //-------------------------------------------------------
    // Functions to monitor data loading

    // TODO merge with dataFactory
    authFactory.startDataLoad = function (callingScope, functionName) {
        Utilities.log("--- start load: " + functionName);
        callingScope.loadingData = true;
    }

    // TODO merge with dataFactory
    authFactory.finishDataLoad = function (callingScope, functionName) {
        Utilities.log("--- finish load: " + functionName);
        callingScope.loadingData = false;
    }

    // TODO merge with dataFactory
    authFactory.failDataLoad = function (callingScope, functionName) {
        Utilities.log("--- failed to load: " + functionName);
        callingScope.loadingData = false;
    }

    //===== Generic json file load/save routines ======
    // Need to consolidate functions, but draft tool uses this

    authFactory.loadJson = function (callingScope, path) {
        // Do not load this locally, must be on server, so go through PHP
        fullRequest = requestBase + "type=LoadJsonFile";
        var data = { "path": path };
        authFactory.startDataLoad(callingScope, "loadJson");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.data = response.data;
                callingScope.status = "loaded";
                authFactory.finishDataLoad(callingScope, "loadJson");
            }, function errorCallback(response) {
                var error = response.statusText;
                callingScope.statusResult = { "result": "failure", "error": error };
                authFactory.reportError("loadJson", error);
                authFactory.failDataLoad(callingScope, "loadJson");
            });
    }
    /*
     *     authFactory.getRegistrationStatus = function (callingScope, email) {
            // type=RegistrationStatus (the entire signup object is sent as JSON data)
            fullRequest = requestBase + "type=RegistrationStatus";
            var data = { "email": email};
            authFactory.startDataLoad(callingScope, "getRegistrationStatus");
            // Should generalize this http call TODO
            $http({
                method: 'POST',
                url: fullRequest,
                data: ObjectToParams(data),  // pass in data as strings
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
            })
                .then(function successCallback(response) {
                    callingScope.statusResult = response.data[0];
                    authFactory.finishDataLoad(callingScope, "getRegistrationStatus");
                }, function errorCallback(response) {
                    var error = response.statusText;
                    callingScope.statusResult = {"result":"failure", "error": error};
                    authFactory.reportError("getRegistrationStatus", error);
                    authFactory.failDataLoad(callingScope, "getRegistrationStatus");
                });
        }
     */
    authFactory.saveJson = function (callingScope, saveObject, path) {
        // type=saveContentLibrary (the content list is sent as JSON data)
        fullRequest = requestBase + "type=SaveJsonFile";
        // Add path as object property: will be deleted before saving
        saveObject.path = path;
        var data = angular.toJson(saveObject);
        authFactory.startDataLoad(callingScope, "saveJson");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                callingScope.status = "returned";
                authFactory.finishDataLoad(callingScope, "saveJson");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveJson", response);
                authFactory.failDataLoad(callingScope, "saveJson");
            });
    }

    //========================== LOGIN AND LOGOUT ===============================

    authFactory.log_in = function (callingScope, email, password) {
        // type=login   (email and password are posted data)
        var fullRequest = requestBase + "type=login";
        var data = { "email": email, "password": password };
        authFactory.startDataLoad(callingScope, "login");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                authFactory.login.permissions = response.data;
                callingScope.loginResult = authFactory.checkLoginResult();
                authFactory.finishDataLoad(callingScope, "login");
            }, function errorCallback(response) {
                callingScope.loginResult = { "result": "failure", "error": "Server Error: " + response.statusText };
                authFactory.reportError("login", response);
                authFactory.failDataLoad(callingScope, "login");
            });
    }

    authFactory.checkLoginResult = function () {
        if (!authFactory.login.permissions || authFactory.login.permissions.length < 1 || authFactory.login.permissions[0].error) {
            return { "result": "failure", "error": authFactory.login.permissions[0].error };
        } else {
            authFactory.login.userId = authFactory.login.permissions[0].userId;
            authFactory.login.userName = authFactory.login.permissions[0].userName;
            authFactory.login.loggedIn = true;
            authFactory.login.isAdmin = false;
            authFactory.login.year = year;
            // We are now only considering user an admin if they have competition level priveleges
            // or higher
            for (iPermit = 1; iPermit < authFactory.login.permissions.length; iPermit++) {
                var permission = authFactory.login.permissions[iPermit];
                if (permission.discriminator != "team" && permission.discriminator != "division") {
                    authFactory.login.isAdmin = true;
                    break;
                }
            }
            authFactory.getTeamList(authFactory.login, year, authFactory.login.userId);
            SaveAuthToSession();
            return { "result": "success"};
        }
    }

    // May revise the database roles at some point, but working with the legacy definitions for now
    authFactory.hasPermission = function (discriminator, id, type) {
        if (!authFactory.login.loggedIn) return false;
        var userId = Number(authFactory.login.userId);
        var typeBit = Number(permissionMap[type]);
        var bitTest = Math.pow(2, typeBit);
        for (iPermit = 1; iPermit < authFactory.login.permissions.length; iPermit++) {
            var permit = authFactory.login.permissions[iPermit];
            // Generally, anytime the discriminator matches and the flag is set, we return true
            switch (discriminator) {
                case "affiliate":
                    if (permit.discriminator == "affiliate" && (bitTest & permit.mask)) return true;
                    break;
                case "competition": // don't bother checking specific competition (year)
                    if (permit.discriminator == "affiliate" && (bitTest & permit.mask)) return true;
                    if (permit.discriminator == "competition" && (bitTest & permit.mask)) return true;
                    break;
                case "division":
                    if (permit.discriminator == "affiliate" && (bitTest & permit.mask)) return true;
                    if (permit.discriminator == "competition" && (bitTest & permit.mask)) return true;
                    if (permit.discriminator == "division" && permit.scopeId == id && (bitTest & permit.mask)) return true;
                    break;
                case "team":
                    if (permit.discriminator == "affiliate" && (bitTest & permit.mask)) return true;
                    if (permit.discriminator == "competition" && (bitTest & permit.mask)) return true;
                    if (permit.discriminator == "team" && permit.scopeId == id && (bitTest & permit.mask)) return true;
                    // Adding division permissions to team heirarchy. This is a little tricky, since the division id associated with a team may not be known and this test will
                    // only succeed if a prior call has been made to load the teamlist
                    if (permit.discriminator == "division" && permit.scopeId == authFactory.getDivisionId(id) && (bitTest & permit.mask)) return true;
                    break;
                case "user":
                    // Only allow league and competition administrators to access for now
                    if (permit.discriminator == "affiliate" && (bitTest & permit.mask)) return true;
                    if (permit.discriminator == "competition" && (bitTest & permit.mask)) return true;
                    break;
            }
        }
        if (discriminator == "user" && userId == id) return true;
        return false;
    }

    // Does user have Manager permissions for any team (or higher level)
    authFactory.isGM = function () {
        if (!authFactory.login.loggedIn) return false;
        var typeBit = Number(permissionMap["Manager"]);
        var bitTest = Math.pow(2, typeBit);
        for (iPermit = 1; iPermit < authFactory.login.permissions.length; iPermit++) {
            var permit = authFactory.login.permissions[iPermit];
            if (permit.discriminator == "affiliate" && (bitTest & permit.mask)) return true;
            if (permit.discriminator == "competition" && (bitTest & permit.mask)) return true;
            // Manager permissions for any division or team is sufficient
            if (permit.discriminator == "division" && (bitTest & permit.mask)) return true;
            if (permit.discriminator == "team" && (bitTest & permit.mask)) return true;
        }
        return false;
    }

    // The following is an obsolete version of isGM which performs a less reliable check of session storage variables.
    // All references have been effectively replaced by the above function (which was previously named isAnyGM) and all
    // references to isAnyGM have been changed to isGM
    /*
    authFactory.isGM = function (callingScope) {
        if (sessionStorage.loggedIn) {
            var teamIdList = JSON.stringify(sessionStorage.teams);
            for (var i = 0; i < teamIdList.length; i++) {
                var temp = teamIdList[i];
                if (authFactory.hasPermission('team', temp.team_id, "Manager")) {
                    return true;
                }
                else {
                    return false;
                }
            }
        }
        else {
            return false;
        }
    }
    */

    authFactory.getPermissionScope = function (permission) {
        if (permission) {
            switch (permission.discriminator) {
                case "affiliate":
                    return "PCBL";
                    break;
                case "competition":
                    return "Summer " + permission.year;
                    break;
                case "division":
                    return permission.divisionYear + " " + permission.divisionName + " Division";
                    break;
                case "team":
                    return permission.teamYear + " " + permission.teamDivision + " " + permission.teamName;
                    break;
                default:
                    return "Unknown";
                    break;
            }
        }
        return "Missing";
    }

    authFactory.getPermissionList = function (permission) {
        if (permission) {
            var bitMask = Number(permission.mask);
            var list = ""
            for (var flag = 0; flag < 6; flag++) {
                if (Math.pow(2, flag) & bitMask) {
                    if (list.length > 0) list += ", ";
                    list += permissionType[flag];
                }
            }
            return list;
        }
        return "Missing";
    }

    /*
    {"userId":"555"}
    {"scopeId":"595","discriminator":"team","year":"","teamName":"Generals","divisionName":"","teamDivision":"Adirondack","mask":"63"}
    */

    authFactory.getPermissions = function (discriminator, id, type) {
        var permissionsList = [];
        if (authFactory.login.loggedIn) {
            for (iPermit = 1; iPermit < authFactory.login.permissions.length; iPermit++) {
                var permit = authFactory.login.permissions[iPermit];
                switch (permit.discriminator) {
                    case "affiliate":
                        permissionsList.push({ "level": "league", "mask": permit.mask });
                        break;
                    case "competition": // don't bother checking specific competition (year)
                        permissionsList.push({ "level": "season", "year": permit.year, "mask": permit.mask });
                        break;
                    case "division":
                        permissionsList.push({ "level": "division", "id": permit.scopeId, "divisionName": permit.divisionName, "mask": permit.mask });
                        break;
                    case "team":
                        permissionsList.push({ "level": "team", "id": permit.scopeId, "teamDivision": permit.teamDivision, "teamName": permit.teamName, "teamYear": permit.teamYear, "mask": permit.mask });
                        break;
                }
            }
        }
        return permissionsList;
    }

    // This function is an internal helper to retrieve the divisionID associated with a given team id. HOWEVER, it only works if a prior
    // call has been made to  dataFactory.loadTeamNames!

    authFactory.getDivisionId = function (teamId) {
        if (!dataFactory.teamNames) return null;
        var divisionId = dataFactory.teamDivisions[teamId];
        if (!divisionId) {
            for (teamIndex in dataFactory.teamNames) {
                var teamInfo = dataFactory.teamNames[teamIndex];
                if (teamInfo.teamId == teamId) {
                    dataFactory.teamDivisions[teamId] = teamInfo.divisionId;
                    return teamInfo.divisionId;
                }
            }
        }
        return divisionId;
    }

    authFactory.requestPasswordReset = function (callingScope, email) {
        // type=RequestReset
        fullRequest = requestBase + "type=RequestReset";
        var data = { "email": email, "nosend": authFactory.nosend };
        authFactory.startDataLoad(callingScope, "requestPasswordReset");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "requestPasswordReset");
            }, function errorCallback(response) {
                callingScope.result = "failure";
                authFactory.reportError("requestPasswordReset", response);
                authFactory.failDataLoad(callingScope, "requestPasswordReset");
            });
    }

    authFactory.resetPassword = function (callingScope, reset) {
        // type=RequestReset
        fullRequest = requestBase + "type=ResetPassword";
        var data = JSON.stringify(reset);
        authFactory.startDataLoad(callingScope, "requestPasswordReset");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.complete = true;
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "requestPasswordReset");
            }, function errorCallback(response) {
                callingScope.complete = true;
                callingScope.result = "failure";
                authFactory.reportError("requestPasswordReset", response);
                authFactory.failDataLoad(callingScope, "requestPasswordReset");
            });
    }

    // Function to ping the server and keep session alive
    authFactory.keepAlive = function (callingScope) {
        // type=keepAlive
        var request = "KeepAlive";
        authFactory.startDataLoad(callingScope, "keepAlive");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.result = response.data[0].result;
            Utilities.log("--- KeepAlive result: " + JSON.stringify(callingScope.result));
            if (callingScope.result.error) {
                callingScope.failure = true;
            }
            authFactory.finishDataLoad(callingScope, "keepAlive");
        }, function errorCallback(response) {
            callingScope.result = "failure";
            callingScope.error = "Server Error: " + response.statusText;
            authFactory.reportError("keepAlive", response);
            authFactory.failDataLoad(callingScope, "keepAlive");
        });
    }

    authFactory.logout = function (callingScope) {
        authFactory.login.loggedIn = false;
        authFactory.login.isAdmin = false;
        authFactory.login.userId = undefined;
        authFactory.login.permissions = null;
        authFactory.login.userName = undefined;
        authFactory.login.teams = null;
        ClearAuthFromSession();

        // Logout on server to destroy session
        request = "logout";

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "logout");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            authFactory.finishDataLoad(callingScope, "logout");
        }, function errorCallback(response) {
            authFactory.reportError("logout", response.statusText);
            authFactory.failDataLoad(callingScope, "logout");
        });
    }

    //========================== REGISTRATION INFO ===============================

    authFactory.getFreeAgentInfo = function (callingScope, year, playerId) {

        // type=getFreeAgentInfo&year=2015&playerId=555;
        request = "FreeAgentInfo&year=" + year + "&playerId=" + playerId;

        authFactory.startDataLoad(callingScope, "getFreeAgentInfo");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.freeAgent = response.data[0];
                authFactory.finishDataLoad(callingScope, "getFreeAgent");
            }, function errorCallback(response) {
                authFactory.reportError("getFreeAgent", response);
                authFactory.failDataLoad(callingScope, "getFreeAgent");
            });
    }

   authFactory.getRegistrationEvents = function (callingScope, year, playerId) {

        // type=RegEvents&year=2015&playerId=555;
        request = "RegEvents&playerId=" + playerId + "&year=" + year;

        // Always return fresh result
        // TODO - this doesn't conform very well with convention, but don't mess with it for now
        authFactory.startDataLoad(callingScope, "getRegistrationEvents");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.registration.events = response.data;
            callingScope.registration.objType = "registration";
            callingScope.registrationEventsLoaded = true;
            authFactory.finishDataLoad(callingScope, "getRegistrationEvents");
        }, function errorCallback(response) {
            authFactory.reportError("getRegistrationEvents", response);
            authFactory.failDataLoad(callingScope, "getRegistrationEvents");
        });
    }

    // Trying to use existing getRegistrationEvents for special events is too messy and risky,
    // so just use a separate handler
    authFactory.getSpecialEvents = function (callingScope, competitionId, playerId) {

        // type=SpecialEvents&competitionId=18&playerId=555;
        request = "SpecialEvents&competitionId=" + competitionId + "&playerId=" + playerId;

        // Try to follow return conventions
        authFactory.startDataLoad(callingScope, "getSpecialEvents");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.events = response.data;
            // Is this an error return?
            if (response.data.length > 0 && response.data[0].error) {
                callingScope.eventsResult = response.data[0];
                callingScope.error = response.data[0].error;
            } else {
                callingScope.eventsResult = { "result": "success" };
            }
            authFactory.finishDataLoad(callingScope, "getSpecialEvents");
        }, function errorCallback(response) {
            callingScope.eventsResult = { "result": "failure" };
            callingScope.eventsResult.error = "Server error: " + response.statusText;
            authFactory.reportError("getSpecialEvents", response);
            authFactory.failDataLoad(callingScope, "getSpecialEvents");
        });
    }

    // Get Status regarding midweek daytime baseball "division"
    authFactory.getDayLeagueInfo = function (callingScope, competitionId, playerId) {
      // type=DayLeague&competitionId=18&playerId=555;
      request = "DayLeague&competitionId=" + competitionId + "&playerId=" +
        playerId;

      // Use standard return value conventions, but this is kind of a mess
      authFactory.startDataLoad(callingScope, "getDayLeagueInfo");
      authFactory.requestHttp(request).then(
        function successCallback(response) {
          callingScope.dayLeague = response.data;
          // Is this an error return?
          if (response.data.length > 0 && response.data[0].error) {
            callingScope.dayLeague = response.data[0];
            // Not great that this is generic
            callingScope.error = response.data[0].error;
          } else {
            callingScope.dayLeague.result = "success";
          }
          authFactory.finishDataLoad(callingScope, "getDayLeagueInfo");
        },
        function errorCallback(response) {
          callingScope.dayLeague = { result: "failure" };
          callingScope.dayLeague.error = "Server error: " + response.statusText;
          authFactory.reportError("getDayLeagueInfo", response);
          authFactory.failDataLoad(callingScope, "getDayLeagueInfo");
        }
      );
    }

    authFactory.registerDayLeague = function (callingScope, playerId) {
      // type=DayLeagueRegister&playerId=555;
      request =
        "DayRegister&playerId=" + playerId;

      // Returns only success or failure
      authFactory.startDataLoad(callingScope, "registerDayLeague");
      authFactory.requestHttp(request).then(
        function successCallback(response) {
          callingScope.result = response.data;
          // Is this an error return?
          if (response.data.length > 0 && response.data[0].error) {
            callingScope.error = response.data[0].error;
          } else {
              // trigger a watch routine
              callingScope.dayLeague.updated = true;
          }
          authFactory.finishDataLoad(callingScope, "registerDayLeague");
        },
        function errorCallback(response) {
          callingScope = { result: "failure" };
          callingScope.error = "Server error: " + response.statusText;
          authFactory.reportError("registerDayLeague", response);
          authFactory.failDataLoad(callingScope, "registerDayLeague");
        }
      );
    }

    // This serves two purposes ... to fill in the "My Teams" in the login menu,
    // and to display on the registration page.
    authFactory.getTeamList = function (callingScope, year, playerId) {

        // type=getTeamList&year=2015&playerId=555;
        request = "GetTeams&year=" + year + "&playerId=" + playerId;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "getTeamList");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.teams = response.data;
            callingScope.teamCount = callingScope.teams.length;
            if (callingScope.objType == "login") {
                // We have loaded teams to menu list .. make sure this
                // gets saved to session settings
                SaveAuthToSession();
            }
            authFactory.finishDataLoad(callingScope, "getTeamList");
        }, function errorCallback(response) {
            authFactory.reportError("getTeamList", response);
            authFactory.failDataLoad(callingScope, "getTeamList");
        });
    }

    // and to display on the registration page.
    authFactory.getTaxiInfo = function (callingScope, year, playerId) {

        // type=getTaxiInfo&year=2015&playerId=555;
        request = "TaxiInfo&year=" + year + "&playerId=" + playerId;

        authFactory.startDataLoad(callingScope, "getTaxiInfo");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.taxi = response.data[0];
            if (callingScope.taxi.join_date) {
                callingScope.taxi.join_date = Date.parse(callingScope.taxi.join_date);
            }
            // Should no longer be necessary with json_encode
            //if (callingScope.taxi.notes) {
            //    callingScope.taxi.notes = RestoreUnsafe(callingScope.taxi.notes);
            //}
            authFactory.finishDataLoad(callingScope, "getTaxiInfo");
        }, function errorCallback(response) {
            authFactory.reportError("getTaxiInfo", response);
            authFactory.failDataLoad(callingScope, "getTaxiInfo");
        });
    }

    //========================== REGISTER FORM ===============================

    authFactory.getDuesInfo = function (callingScope, targetYear) {

        // type=DuesInfo&year=2015;
        // Going to hard code the year for now
        request = "DuesInfo&year=" + targetYear;
        request += "&userId=" + authFactory.login.userId;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "getDuesInfo");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.duesInfo = response.data[0];
            callingScope.checkRegister = "DuesInfo";
            authFactory.finishDataLoad(callingScope, "getDuesInfo");
        }, function errorCallback(response) {
            authFactory.reportError("getDuesInfo", response);
            authFactory.failDataLoad(callingScope, "getDuesInfo");
        });
    }

    authFactory.getEligibleTeams = function (callingScope, targetYear, playerId) {

        // type=EligibleTeams&year=2015&playerId=555;
        request = "EligibleTeams&year=" + targetYear + "&playerId=" + playerId;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "getEligibleTeams");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.teams = response.data;
            callingScope.checkRegister = "teams";
            authFactory.finishDataLoad(callingScope, "getEligibleTeams");
        }, function errorCallback(response) {
            authFactory.reportError("getEligibleTeams", response);
            authFactory.failDataLoad(callingScope, "getEligibleTeams");
        });
    }

    authFactory.getDuesBalance = function (callingScope, targetYear, playerId) {

        // type=DuesBalance&year=2015&playerId=555;
        request = "DuesBalance&year=" + targetYear + "&playerId=" + playerId;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "getDuesBalance");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.duesBalance = response.data[0];
            callingScope.checkRegister = "duesBalance";
            authFactory.finishDataLoad(callingScope, "getDuesBalance");
        }, function errorCallback(response) {
            authFactory.reportError("getDuesBalance", response);
            authFactory.failDataLoad(callingScope, "getDuesBalance");
        });
    }

    authFactory.register = function (callingScope, formData) {

        // type=Register (attempting to post as JSON data
        fullRequest = requestBase + "type=Register";
        var data = JSON.stringify(formData);
        authFactory.startDataLoad(callingScope, "register");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                callingScope.registrationId = callingScope.result.registrationId;
                callingScope.registerComplete = "returned";
                authFactory.finishDataLoad(callingScope, "register");
            }, function errorCallback(response) {
                callingScope.result = {};
                currentTime = new Date();
                callingScope.errorDetails = "Server error " + response.status + " at " + currentTime ;
                callingScope.registerComplete = "failed";
                authFactory.reportError("register", response);
                authFactory.failDataLoad(callingScope, "register");
            });
    }

    authFactory.eventRegister = function (callingScope, competitionId, playerId) {

        // type=EventRegister&competitionId=18&playerId=555;
        request = "EventRegister&competitionId=" + competitionId + "&playerId=" + playerId;

        // Try to follow return conventions
        authFactory.startDataLoad(callingScope, "eventRegister");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.registerResult = response.data[0];
            // Is this an error return?
            if (callingScope.registerResult.error) {
                callingScope.error = callingScope.registerResult.error;
            }
            authFactory.finishDataLoad(callingScope, "eventRegister");
        }, function errorCallback(response) {
            callingScope.registerResult = { "result": "failure" };
            callingScope.registerResult.error = "Server error: " + response.statusText;
            authFactory.reportError("eventRegister", response);
            authFactory.failDataLoad(callingScope, "eventRegister");
        });
    }

    //========================== DRAFT REGISTRATION ===============================

    authFactory.registerDraft = function (callingScope, draftForm) {
        // type=Register (attempting to post as JSON data
        fullRequest = requestBase + "type=RegDraft";
        var data = JSON.stringify(draftForm);
        authFactory.startDataLoad(callingScope, "registerDraft");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "registerDraft");
            }, function errorCallback(response) {
                callingScope.result = {};
                callingScope.result.error = "Server Error: " + response.statusText;
                authFactory.reportError("registerDraft", response);
                authFactory.failDataLoad(callingScope, "registerDraft");
            });
    }

    authFactory.editDraftProfile = function (callingScope, draftForm) {
        // type=EditDraftProfile (attempting to post as JSON data
        fullRequest = requestBase + "type=EditDraftProfile";
        var data = JSON.stringify(draftForm);
        authFactory.startDataLoad(callingScope, "registerDraft");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "editDraftProfile");
            }, function errorCallback(response) {
                callingScope.result = {};
                callingScope.result.error = "Server Error: " + response.statusText;
                authFactory.reportError("editDraftProfile", response);
                authFactory.failDataLoad(callingScope, "editDraftProfile");
            });
    }

    authFactory.reportDraftPicks = function (callingScope, pickList) {
        // type=RecordDraft (attempting to post as JSON data
        fullRequest = requestBase + "type=RecordDraft";
        var data = JSON.stringify(pickList);
        authFactory.startDataLoad(callingScope, "reportDraftPicks");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "reportDraftPicks");
            }, function errorCallback(response) {
                callingScope.result = {};
                callingScope.result.error = "Server Error: " + response.statusText;
                authFactory.reportError("reportDraftPicks", response);
                authFactory.failDataLoad(callingScope, "reportDraftPicks");
            });
    }

    authFactory.changeDraftStatus = function (callingScope, poolId, isDrafted) {
        // type=ChangeDraftStatus&poolId=1555&isDrafted=true;
        request = "ChangeDraftStatus&poolId=" + poolId + "&drafted=" + isDrafted;
        authFactory.startDataLoad(callingScope, "changeDraftStatus");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "changeDraftStatus");
            }, function errorCallback(response) {
                callingScope.result = {};
                    callingScope.result.error = "Error changing Draft Status: " + response.statusText // wrong?
                    authFactory.reportError("changeDraftStatus", response);
                    authFactory.failDataLoad(callingScope, "changeDraftStatus");
            });
    }

    //========================== FREE AGENT TOOL  ===============================

    authFactory.registerFreeAgent = function (callingScope, freeAgentForm) {
        // type=Register (attempting to post as JSON data
        fullRequest = requestBase + "type=RegFreeAgent";
        var data = JSON.stringify(freeAgentForm);
        authFactory.startDataLoad(callingScope, "registerFreeAgent");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "registerFreeAgent");
            }, function errorCallback(response) {
                callingScope.result = {};
                callingScope.result.error = "Server Error: " + response.statusText;
                authFactory.reportError("registerFreeAgent", response);
                authFactory.failDataLoad(callingScope, "registerFreeAgent");
            });
    }

    authFactory.editFreeAgentProfile = function (callingScope, freeAgentForm) {
        // type=EditFreeAgentProfile (attempting to post as JSON data
        fullRequest = requestBase + "type=EditFreeAgentProfile";
        var data = JSON.stringify(freeAgentForm);
        authFactory.startDataLoad(callingScope, "editFreeAgentProfile");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "editFreeAgentProfile");
            }, function errorCallback(response) {
                callingScope.result = {};
                callingScope.result.error = "Server Error: " + response.statusText;
                authFactory.reportError("editFreeAgentProfile", response);
                authFactory.failDataLoad(callingScope, "editFreeAgentProfile");
            });
    }

    authFactory.placeFreeAgentClaim = function (callingScope, newClaim) {
        fullRequest = requestBase + "type=PlaceClaim";
        var data = JSON.stringify(newClaim);
        authFactory.startDataLoad(callingScope, "placeFreeAgentClaim");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "placeFreeAgentClaim");
            }, function errorCallback(response) {
                callingScope.result = { "result": "failure", "error": "Server error: " + response.statusText };
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("placeFreeAgentClaim", response);
                authFactory.failDataLoad(callingScope, "placeFreeAgentClaim");
            });
    }

    authFactory.awardClaim = function (callingScope, awarded) {
        fullRequest = requestBase + "type=AwardClaim";
        var data = JSON.stringify(awarded);
        authFactory.startDataLoad(callingScope, "awardClaim");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "awardClaim");
            }, function errorCallback(response) {
                callingScope.result = { "result": "failure", "error": "Server error: " + response.statusText };
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("awardClaim", response);
                authFactory.failDataLoad(callingScope, "awardClaim");
            });
    }


    //========================== OTHER REGISTRATION FUNCTIONS ===============================

    authFactory.changeStatus = function (callingScope, playerId, teamId) {

        // type=ChangeStatus&playerId=555&teamId=767;
        request = "ChangeStatus&playerId=" + playerId + "&teamId=" + teamId;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "changeStatus");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.statusResult = response.data[0];
            authFactory.finishDataLoad(callingScope, "changeStatus");
        }, function errorCallback(response) {
            callingScope.statusResult = {};
            callingScope.statusResult.error = "Error changing Status: " + response.statusText // wrong?
            authFactory.reportError("changeStatus", response);
            authFactory.failDataLoad(callingScope, "changeStatus");
        });
    }

    authFactory.deactivate = function (callingScope, playerId, teamId, sendMail) {

        // type=Deactivate&playerId=555&teamId=767&sendMail=true;
        request = "Deactivate&playerId=" + playerId + "&teamId=" + teamId + "&sendMail=" + sendMail;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "deactivate");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.deactivateResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "deactivate");
            }, function errorCallback(response) {
                callingScope.deactivateResult = {};
                callingScope.deactivateResult.error = "Error deactivating: " + response.statusText // wrong?
                authFactory.reportError("deactivate", response);
                authFactory.failDataLoad(callingScope, "deactivate");
            });
    }

    authFactory.removeFromRoster = function (callingScope, playerId, teamId) {

        // type=RemoveFromRoster&playerId=555&teamId=767;
        request = "RemoveFromRoster&playerId=" + playerId + "&teamId=" + teamId;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "removeFromRoster");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.removeFromRosterResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "removeFromRoster");
            }, function errorCallback(response) {
                callingScope.removeFromRosterResult = {};
                callingScope.removeFromRosterResult.error = "Error removing from team: " + response.statusText // wrong?
                authFactory.reportError("removeFromRoster", response);
                authFactory.failDataLoad(callingScope, "removeFromRoster");
            });
    }

    authFactory.removeFromDraft = function (callingScope, playerId, year) {

        // type=RemoveDraft&playerId=555&year=2018;
        request = "RemoveFromDraft&playerId=" + playerId + "&year=" + year;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "removeFromDraft");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.removeFromDraftResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "removeFromDraft");
            }, function errorCallback(response) {
                callingScope.removeFromDraftResult = {};
                callingScope.removeFromDraftResult.error = "Server Error removing from draft: " + response.statusText // wrong?
                authFactory.reportError("removeFromDraft", response);
                authFactory.failDataLoad(callingScope, "removeFromDraft");
            });
    }

    authFactory.transferPlayer = function (callingScope, playerId, fromTeamId, toTeamId) {

        // type=TransferPlayer&playerId=555&fromTeamId=855&toTeamId=858;
        request = "TransferPlayer&playerId=" + playerId + "&fromTeamId=" + fromTeamId + "&toTeamId=" + toTeamId;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "transferPlayer");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.transferPlayerResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "transferPlayer");
            }, function errorCallback(response) {
                callingScope.transferPlayerResult = {};
                callingScope.transferPlayerResult.error = "Server Error removing from draft: " + response.statusText // wrong?
                authFactory.reportError("transferPlayer", response);
                authFactory.failDataLoad(callingScope, "transferPlayer");
            });
    }

    authFactory.mergeDup = function (callingScope, playerId, dupId) {

        // type=Deactivate&playerId=555&teamId=767;
        request = "MergeDup&replace=" + dupId + "&with=" + playerId;

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "mergeDup");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.mergeResult = response.data[0];
            if (callingScope.mergeResult.result != "success") callingScope.mergeResult.error = "failed";
            authFactory.finishDataLoad(callingScope, "mergeDup");
        }, function errorCallback(response) {
            callingScope.mergeResult = {};
            callingScope.mergeResult.result = "Server Error";
            callingScope.mergeResult.error = "Error merging dup: " + response.statusText
            authFactory.reportError("mergeDup", response);
            authFactory.failDataLoad(callingScope, "mergeDup");
        });
    }

    authFactory.joinTaxi = function (callingScope, taxiForm) {

        // type=TaxiJoin
        // form data passed as json object
        fullRequest = requestBase + "type=TaxiJoin";
        var data = angular.toJson(taxiForm);
        authFactory.startDataLoad(callingScope, "joinTaxi");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.taxiChange = response.data[0];
                authFactory.finishDataLoad(callingScope, "joinTaxi");
            }, function errorCallback(response) {
                callingScope.taxiChange = {};
                callingScope.taxiChange.result = "failure";
                callingScope.taxiChange.error = "Server Error: " + response.statusText;
                authFactory.reportError("joinTaxi", response);
                authFactory.failDataLoad(callingScope, "joinTaxi");
            });
    }

    authFactory.leaveTaxi = function (callingScope, playerId) {

        // type=TaxiLeave&playerId=555
        request = "TaxiLeave&playerId=" + playerId;

        authFactory.startDataLoad(callingScope, "leaveTaxi");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.taxiChange = response.data[0];
                authFactory.finishDataLoad(callingScope, "leaveTaxi");
            }, function errorCallback(response) {
                callingScope.taxiChange = {};
                callingScope.taxiChange.result = "failure";
                callingScope.taxiChange.error = "Server Error: " + response.statusText;
                authFactory.reportError("leaveTaxi", response);
                authFactory.failDataLoad(callingScope, "leaveTaxi");
            });
    }

    authFactory.signWaiver = function (callingScope, playerId) {

        // type=TaxiLeave&playerId=555
        request = "SignWaiver&playerId=" + playerId;

        authFactory.startDataLoad(callingScope, "signWaiver");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "signWaiver");
            }, function errorCallback(response) {
                callingScope.taxiChange = {};
                callingScope.taxiChange.result = "failure";
                callingScope.taxiChange.error = "Server Error: " + response.statusText;
                authFactory.reportError("signWaiver", response);
                authFactory.failDataLoad(callingScope, "signWaiver");
            });
    }

    //========================== PLAYER PROFILE ===============================

    authFactory.getProfile = function (callingScope, userId) {

        // type=Profile&userId=555;
        request = "Profile&playerId=" + userId;
        authFactory.startDataLoad(callingScope, "getProfile");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.profile = response.data[0];
            callingScope.profile.birth_date = Date.parse(callingScope.profile.birth_date);
            // TODO these should be separate from login credentials for admin viewing of other users
            callingScope.profile.userName = authFactory.login.userName;
            callingScope.profile.permissions = authFactory.login.permissions;
            callingScope.profile.objType = "profile";
            authFactory.finishDataLoad(callingScope, "getProfile");
        }, function errorCallback(response) {
            authFactory.reportError("getProfile", response);
            authFactory.failDataLoad(callingScope, "getProfile");
        });
    }

    authFactory.getRoles = function (callingScope, userId) {

        // type=Roles&userId=555;
        request = "Roles&playerId=" + userId;
        authFactory.startDataLoad(callingScope, "getRoles");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.roles = response.data;
            callingScope.rolesLoaded = true;
            authFactory.finishDataLoad(callingScope, "getRoles");
        }, function errorCallback(response) {
            authFactory.reportError("getRoles", response);
            authFactory.failDataLoad(callingScope, "getRoles");
        });
    }

    authFactory.getPreferences = function (callingScope, playerId) {

        // type=Preferences&playerId=555;
        request = "Preferences&playerId=" + playerId;
        authFactory.startDataLoad(callingScope, "getPreferences");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.preferences = response.data[0];
            callingScope.preferences.objType = "preferences";
            authFactory.finishDataLoad(callingScope, "getPreferences");
        }, function errorCallback(response) {
            authFactory.reportError("getPreferences", response);
            authFactory.failDataLoad(callingScope, "getPreferences");
        });
    }

    authFactory.saveProfile = function (callingScope, profile) {
        // type=SaveProfile
        fullRequest = requestBase + "type=SaveProfile";
        var data = JSON.stringify(profile);
        authFactory.startDataLoad(callingScope, "saveProfile");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "saveProfile");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveProfile", response);
                authFactory.failDataLoad(callingScope, "saveProfile");
            });
    }

    authFactory.savePreferences = function (callingScope, preferences) {
        // type=SavePreferences
        fullRequest = requestBase + "type=SavePreferences";
        var data = JSON.stringify(preferences);
        authFactory.startDataLoad(callingScope, "savePreferences");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "savePreferences");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("savePreferences", response);
                authFactory.failDataLoad(callingScope, "savePreferences");
            });
    }
    authFactory.saveRoles = function (callingScope, settings) {
        // type=SaveRoles
        fullRequest = requestBase + "type=SaveRoles";
        var data = JSON.stringify(settings);
        authFactory.startDataLoad(callingScope, "saveRoles");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                if (callingScope.result.error) {
                    callingScope.error = "Save failed. Reason = " + callingScope.result.error;
                } else {
                    callingScope.confirm = "Save successful";
                }
                authFactory.finishDataLoad(callingScope, "saveRoles");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.error = "Save failed. Reason = " + response.statusText;
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveRoles", response);
                authFactory.failDataLoad(callingScope, "saveRoles");
            });
    }

    //========================== ACCOUNT CREATION AND INVITATIONS ===============================
    
    authFactory.requestAccount = function (callingScope, email, name, fromAdmin) {

        fullRequest = requestBase + "type=RequestAccount";
        var data = { "email": email, "name": name, "nosend": authFactory.nosend, "fromAdmin": fromAdmin };
        authFactory.startDataLoad(callingScope, "requestAccount");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.requestResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "requestAccount");
            }, function errorCallback(response) {
                authFactory.reportError("requestAccount", response);
                callingScope.requestResult = { "result": "failure", "error": "Server error: " + response.statusText };
                authFactory.failDataLoad(callingScope, "requestAccount");
            });
    }

    authFactory.invitePlayer = function (callingScope, email, name, teamId, resend) {

        fullRequest = requestBase + "type=InvitePlayer";
        var data = { "senderId": callingScope.userId, "email": email, "name": name, "teamId": teamId, "nosend": authFactory.nosend, "resend": resend};
        //var data = { "senderId": callingScope.userId, "email": email, "name": name, "teamId": teamId };
        authFactory.startDataLoad(callingScope, "InvitePlayer");
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as POST object
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "InvitePlayer");
            }, function errorCallback(response) {
                authFactory.reportError("InvitePlayer", response);
                callingScope.result = { "result": "failure", "error": "Server error: " + response.statusText };
                authFactory.failDataLoad(callingScope, "InvitePlayer");
            });
    }

    authFactory.getInvitees = function (callingScope, teamId) {

        // type=Invitees&teamId=666;
        request = "Invitees&teamId=" + teamId;
        authFactory.startDataLoad(callingScope, "getInvitees");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.players = response.data;
            authFactory.finishDataLoad(callingScope, "getInvitees");
        }, function errorCallback(response) {
            callingScope.players = [];
            authFactory.reportError("getInvitees", response);
            authFactory.failDataLoad(callingScope, "getInvitees");
        });
    }

    authFactory.validateToken = function (callingScope, email, teamId, token) {

        fullRequest = requestBase + "type=ValidateToken";
        var data = { "email": email, "token": token , "teamId": teamId};
        authFactory.startDataLoad(callingScope, "validateToken");
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as POST object
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
        .then(function successCallback(response) {
            callingScope.validateResult = response.data[0];
            authFactory.finishDataLoad(callingScope, "validateToken");
        }, function errorCallback(response) {
            authFactory.reportError("validateToken", response);
            authFactory.failDataLoad(callingScope, "validateToken");
        });
    }

    authFactory.createAccount = function (callingScope) {
        // type=CreateAccount (the entire signup object is sent as JSON data)
        fullRequest = requestBase + "type=CreateAccount";
        var data = JSON.stringify(callingScope);
        authFactory.startDataLoad(callingScope, "createAccount");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.createResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "createAccount");
            }, function errorCallback(response) {
                callingScope.createComplete = "failed";
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("createAccount", response);
                authFactory.failDataLoad(callingScope, "createAccount");
            });
    }

    authFactory.getRegistrationStatus = function (callingScope, email) {
        // type=RegistrationStatus (the entire signup object is sent as JSON data)
        fullRequest = requestBase + "type=RegistrationStatus";
        var data = { "email": email};
        authFactory.startDataLoad(callingScope, "getRegistrationStatus");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.statusResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "getRegistrationStatus");
            }, function errorCallback(response) {
                var error = response.statusText;
                callingScope.statusResult = {"result":"failure", "error": error};
                authFactory.reportError("getRegistrationStatus", error);
                authFactory.failDataLoad(callingScope, "getRegistrationStatus");
            });
    }

    authFactory.rejectInvitation = function (callingScope, email, teamId, token) {
        fullRequest = requestBase + "type=RejectInvite";
        var data = { "email": email, "teamId": teamId, "token": token };
        authFactory.startDataLoad(callingScope, "rejectInvitation");
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as POST object
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
        .then(function successCallback(response) {
            callingScope.rejectResult = response.data[0];
            authFactory.finishDataLoad(callingScope, "rejectInvitation");
        }, function errorCallback(response) {
            authFactory.reportError("rejectInvitation", response);
            authFactory.failDataLoad(callingScope, "rejectInvitation");
        });
    }

    authFactory.acceptInvite = function (callingScope, email, userId, teamId, token) {
        fullRequest = requestBase + "type=AcceptInvite";
        var data = { "email": email, "userId": userId, "teamId": teamId, "token": token };
        authFactory.startDataLoad(callingScope, "acceptInvite");
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as POST object
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.acceptResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "acceptInvite");
            }, function errorCallback(response) {
                authFactory.reportError("acceptInvite", response);
                authFactory.failDataLoad(callingScope, "acceptInvite");
            });
    }

    authFactory.uploadTryoutInfo = function (callingScope, adminId, draftRegistrationId, bibNumber, photo) {
        fullRequest = requestBase + "type=UploadTryoutInfo";
        var data = { "adminId": adminId, "draftRegistrationId": draftRegistrationId, "bibNumber": bibNumber, "photo": photo };
        authFactory.startDataLoad(callingScope, "uploadTryoutInfo");
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as POST object
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.uploadTryoutResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "uploadTryoutInfo");
            }, function errorCallback(response) {
                authFactory.reportError("acceptInvite", response);
                authFactory.failDataLoad(callingScope, "uploadTryoutInfo");
            });
    }

    //======================================== RSVP ========================================================

    authFactory.getRSVP = function (callingScope, teamId, userId) {

        // type=RSVP&teamId=1099&userId=555;
        request = "RSVP&teamId=" + teamId + "&userId=" + userId;
        authFactory.startDataLoad(callingScope, "getRSVP");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.rsvpList = response.data;
                callingScope.rsvpLoaded = true;
                authFactory.finishDataLoad(callingScope, "getRSVP");
            }, function errorCallback(response) {
                    authFactory.reportError("getRSVP", response);
                    authFactory.failDataLoad(callingScope, "getRSVP");
            });
    }

    authFactory.sendRSVP = function (callingScope, rsvpData) {
        // type=SendRSVP
        fullRequest = requestBase + "type=SendRSVP";
        var data = angular.toJson(rsvpData);
        authFactory.startDataLoad(callingScope, "sendRSVP");
        callingScope.rsvpSent = false;
       // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                callingScope.rsvpSent = true;
                if (callingScope.result.error) {
                    callingScope.error = "Send failed. Reason: " + callingScope.result.error;
                } else {
                    callingScope.confirm = "RSVPs successfully sent"
                }
                authFactory.finishDataLoad(callingScope, "sendRSVP");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.error = "Send failed. Reason: " + response.message;
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("sendRSVP", response);
                authFactory.failDataLoad(callingScope, "sendRSVP");
            });
    }
    
    //======================================== Support ========================================================

    authFactory.getSupportItems = function (callingScope, year) {
        // type=GetItems&year=2022
        // type=RSVP&teamId=1099&userId=555;
        request = "GetItems&year=" + year;
        authFactory.startDataLoad(callingScope, "getSupportItems");
        authFactory.requestHttp(request, supportBase)
            .then(function successCallback(response) {
                callingScope.items = response.data;
                callingScope.result = true;
                authFactory.finishDataLoad(callingScope, "getSupportItems");
            }, function errorCallback(response) {
                authFactory.reportError("getSupportItems", response);
                authFactory.failDataLoad(callingScope, "getSupportItems");
            });
    }

    authFactory.updateSupportAssignee = function (callingScope, assigneeName, itemID, status) {

        request = `UpdateAssigneeStatus&itemID=${itemID}&assignee=${assigneeName}&status=${status}`;
        authFactory.startDataLoad(callingScope, "updateSupportAssigneeStatus");
        authFactory.requestHttp(request, supportBase)
            .then(function successCallback(response) {
                callingScope.result = true;
                authFactory.finishDataLoad(callingScope, "updateSupportAssigneeStatus");
            }, function errorCallback(response) {
                authFactory.reportError("updateSupportAssigneeStatus", response);
                authFactory.failDataLoad(callingScope, "updateSupportAssigneeStatus");
            });
    }

    authFactory.updateItemOriginID = function (callingScope, itemID, originID) {

        request = `updateItemOriginID&itemID=${itemID}&originID=${originID}`;
        authFactory.startDataLoad(callingScope, "updateItemOriginID");
        authFactory.requestHttp(request, supportBase)
            .then(function successCallback(response) {
                callingScope.result = true;
                authFactory.finishDataLoad(callingScope, "updateItemOriginID");
            }, function errorCallback(response) {
                authFactory.reportError("updateItemOriginID", response);
                authFactory.failDataLoad(callingScope, "updateItemOriginID");
            });
    }

    //========================== SCORE, STAT, and UMPIRE FEEDBACK Submission ===============================

    authFactory.submitScore = function (callingScope, score) {
        // type=SaveScore (the feedback object is sent as JSON data)
        fullRequest = requestBase + "type=SaveScore";
        var data = JSON.stringify(score);
        authFactory.startDataLoad(callingScope, "submitScore");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                score.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "submitScore");
            }, function errorCallback(response) {
                score.result = { "result": "failure", "error": "Server error: " + response.statusText };
                authFactory.reportError("submitScore", response);
                authFactory.failDataLoad(callingScope, "submitScore");
            });
    }

    authFactory.submitStats = function (callingScope, saveStats) {
        // type=SaveStats (the feedback object is sent as JSON data)
        fullRequest = requestBase + "type=SaveStats";
        var data = JSON.stringify(saveStats);
        authFactory.startDataLoad(callingScope, "submitStats");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                saveStats.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "submitStats");
            }, function errorCallback(response) {
                saveStats.result = { "result": "failure", "error": "Server error: " + response.statusText };
                authFactory.reportError("submitStats", response);
                authFactory.failDataLoad(callingScope, "submitStats");
            });
    }

    authFactory.getUmpireFeedback = function (callingScope) {
        // type=GetFeedback;
        request = "GetFeedback";
        authFactory.startDataLoad(callingScope, "getUmpireFeedback");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.reports = response.data;
            authFactory.finishDataLoad(callingScope, "getUmpireFeedback");
        }, function errorCallback(response) {
            callingScope.reports = [];
            authFactory.reportError("getUmpireFeedback", response);
            authFactory.failDataLoad(callingScope, "getUmpireFeedback");
        });
    }

    authFactory.submitFeedback = function (callingScope, feedback) {
        // type=SaveFeedback;
        fullRequest = requestBase + "type=SaveFeedback";
        var data = JSON.stringify(feedback);
        authFactory.startDataLoad(callingScope, "submitFeedback");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                feedback.result = response.data[0];
                feedback.status = "returned";
                authFactory.finishDataLoad(callingScope, "submitFeedback");
            }, function errorCallback(response) {
                feedback.status = "failed";
                feedback.errorDetails = response.statusText;
                authFactory.reportError("submitFeedback", response);
                authFactory.failDataLoad(callingScope, "submitFeedback");
            });
    }

    //========================== Admin Functions ===============================

    authFactory.getBillingTransactions = function (callingScope, year, page, perPage) {
        // type=Transactions&year=2015&page=0&perPage=100
        if (perPage < 0) {
            perPage = 2000; // absolute limit
        }
        request = "Transactions";
        request += "&year=" + year;
        request += "&page=" + page;
        request += "&perPage=" + perPage;
        authFactory.startDataLoad(callingScope, "getBillingTransactions");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.transactions = response.data;
            authFactory.finishDataLoad(callingScope, "getBillingTransactions");
        }, function errorCallback(response) {
            callingScope.reports = [];
            authFactory.reportError("getBillingTransactions", response);
            authFactory.failDataLoad(callingScope, "getBillingTransactions");
        });
    }

    authFactory.getBillingSummary = function (callingScope, year) {
        // type=BillingSummary
        request = "BillingSummary";
        request += "&year=" + year;
        authFactory.startDataLoad(callingScope, "getBillingSummary");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            returnObject = response.data[0];
            callingScope.registrations = returnObject.registrations;
            callingScope.transactionCount = returnObject.transactionCount;
            callingScope.successfulTransactions = returnObject.successfulTransactions;
            callingScope.amountCollected = returnObject.amountCollected;
            callingScope.amountExpected = returnObject.amountExpected;
            authFactory.finishDataLoad(callingScope, "getBillingSummary");
        }, function errorCallback(response) {
            callingScope.registrations = "???";
            callingScope.transactionCount = "???";
            callingScope.successfulTransactions = "???";
            callingScope.amountCollected = 0;
            callingScope.amountExpected = 0;
            authFactory.reportError("getBillingSummary", response);
            authFactory.failDataLoad(callingScope, "getBillingSummary");
        });
    }

    authFactory.processTicket = function (callingScope, ticket) {
        // type=CreateAccount (the entire signup object is sent as JSON data)
        fullRequest = requestBase + "type=ProcessTicket";
        var data = JSON.stringify(ticket);
        authFactory.startDataLoad(callingScope, "processTicket");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.ticketResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "processTicket");
            }, function errorCallback(response) {
                callingScope.ticketResult = {};
                callingScope.ticketResult.error = "Processing Error: " + response.statusText;
                authFactory.reportError("processTicket", response);
                authFactory.failDataLoad(callingScope, "processTicket");
            });
    }

    authFactory.getSecurityToken = function (callingScope) {
        // payment.php?type=GetToken
        request = "GetToken";
        authFactory.startDataLoad(callingScope, "getSecurityToken");
        authFactory.requestHttp(request, payBase)
        .then(function successCallback(response) {
            callingScope.tokenResult = response.data;
            authFactory.finishDataLoad(callingScope, "getSecurityToken");
        }, function errorCallback(response) {
            callingScope.tokenResult = { "result": "failure", "error": "Token Error: " + response.statusText };
            authFactory.reportError("getSecurityToken", response);
            authFactory.failDataLoad(callingScope, "getSecurityToken");
        });
    }

    authFactory.submitPayment = function (callingScope, nonce, amount, orderId, firstName, lastName) {
        // payment.php?type=Submit
        fullRequest = payBase + "type=Submit";
        var data = { "amount": amount, "nonce": nonce, "orderId": orderId, "firstName": firstName, "lastName": lastName };
        authFactory.startDataLoad(callingScope, "submitPayment");
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as POST object
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        }).then(function successCallback(response) {
            callingScope.paymentResult = response.data[0];
            authFactory.finishDataLoad(callingScope, "submitPayment");
        }, function errorCallback(response) {
            callingScope.paymentResult = { "result": "failure", "error": "Payment Error: " + response.statusText };
            authFactory.reportError("submitPayment", response);
            authFactory.failDataLoad(callingScope, "submitPayment");
        });
    }

    authFactory.getPlayerSearch = function (callingScope, playerId, playerFirstName, playerLastName, playerEmail, searchType) {
        // type=SearchPlayer&playerId=669&playerFirstName=Jeff&playerLastName=Kyger&playerEmail=test@gmail.com (any combo)
        request = "SearchPlayer";
        if (playerId) request += "&playerId=" + playerId;
        if (playerFirstName) request += "&firstName=" + playerFirstName;
        if (playerLastName) request += "&lastName=" + playerLastName;
        if (playerEmail) request += "&email=" + playerEmail;
        if (searchType) request += "&searchType=" + searchType;
        authFactory.startDataLoad(callingScope, "getPlayerSearch");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.searchResults = response.data;
            authFactory.finishDataLoad(callingScope, "getPlayerSearch");
        }, function errorCallback(response) {
            authFactory.reportError("getPlayerSearch", response);
            authFactory.failDataLoad(callingScope, "getPlayerSearch");
        });
    };

    authFactory.getAccountSearch = function (callingScope, queryType, year) {
        request = "SearchAccount&queryType=" + queryType;
        if (year) request += "&year=" + year;
        authFactory.startDataLoad(callingScope, "getAccountSearch");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.searchResults = response.data;
            authFactory.finishDataLoad(callingScope, "getAccountSearch");
        }, function errorCallback(response) {
            authFactory.reportError("getAccountSearch", response);
            authFactory.failDataLoad(callingScope, "getAccountSearch");
        });
    };

    authFactory.saveContentLibrary = function (callingScope, library) {
        // type=saveContentLibrary (the content list is sent as JSON data)
        fullRequest = requestBase + "type=SaveContentLibrary";
        //var data = JSON.stringify(library);
        var data = angular.toJson(library);
        authFactory.startDataLoad(callingScope, "saveContentLibrary");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                callingScope.status = "returned";
                authFactory.finishDataLoad(callingScope, "saveContentLibrary");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveContentLibrary", response);
                authFactory.failDataLoad(callingScope, "saveContentLibrary");
            });
    }

    authFactory.saveArticleHtml = function (callingScope, contentId, html) {
        // type=saveArticleHtml (the feedback object is sent as JSON data)
        fullRequest = requestBase + "type=SaveArticleHtml&contentId=" + contentId;
        var data = html;
        authFactory.startDataLoad(callingScope, "saveArticleHtml");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                callingScope.status = "returned";
                authFactory.finishDataLoad(callingScope, "saveArticleHtml");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveArticleHtml", response);
                authFactory.failDataLoad(callingScope, "saveArticleHtml");
            });
    }

    // This method is a little different in that it does not return the data to the controller,
    // but presents it as a downloaded file.
    authFactory.downloadMailList = function (callingScope) {
        // type=MailList&listType=All (can be All or GMs)
        request = "MailList&listType=" + callingScope.listType;
        request += "&year=" + callingScope.year;
        authFactory.startDataLoad(callingScope, "downloadMailList");
        authFactory.requestText(request)
        .then(function successCallback(response) {
            dataFactory.downloadAsFile(response.data, 'ImportList' + callingScope.listType + '.csv');
            authFactory.finishDataLoad(callingScope, "getPlayerSearch");
        }, function errorCallback(response) {
            authFactory.reportError("downloadMailList", response);
            authFactory.failDataLoad(callingScope, "downloadMailList");
        });
    };

    //========================== Discipline Functions ===============================

    //  Gets the Active Discipline Cases for the Discipline Page of the Admin Tools
    authFactory.getActiveDisciplines = function (callingScope) {
        request = "ActiveDisciplines";
        authFactory.startDataLoad(callingScope, "getActiveDisciplines");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.incident = response.data;
                // Utilities.log(response.data);
                authFactory.finishDataLoad(callingScope, "getActiveDisciplines");
            }, function errorCallback(response) {
                authFactory.reportError("getActiveDisciplines", response);
                authFactory.failDataLoad(callingScope, "getActiveDisciplines");
            });
    };

    //  Gets the Archived Discipline Cases for the Discipline Page of the Admin Tools
    authFactory.getArchivedDisciplines = function (callingScope) {
        request = "ArchivedDisciplines";
        authFactory.startDataLoad(callingScope, "getArchivedDisciplines");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.incident = response.data;
                // Utilities.log(response.data);
                authFactory.finishDataLoad(callingScope, "getArchivedDisciplines");
            }, function errorCallback(response) {
                authFactory.reportError("getArchivedDisciplines", response);
                authFactory.failDataLoad(callingScope, "getArchivedDisciplines");
            });
    };

    //  Gets All Discipline Cases for the Discipline Page of the Admin Tools
    authFactory.getDisciplines = function (callingScope) {
        request = "GetDisciplines";
        authFactory.startDataLoad(callingScope, "getDisciplines");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.incident = response.data;
                // Utilities.log(response.data);
                authFactory.finishDataLoad(callingScope, "getDisciplines");
            }, function errorCallback(response) {
                authFactory.reportError("getDisciplines", response);
                authFactory.failDataLoad(callingScope, "getDisciplines");
            });
    };

    //  Save Discipline Function
    //  Takes new or updated discipline object and sends to admin.php for update
    authFactory.saveDiscipline = function (callingScope, disciplineInfo) {
        // type = SaveDiscipline
        fullRequest = requestBase + "type=SaveDiscipline";
        var data = JSON.stringify(disciplineInfo);
        authFactory.startDataLoad(callingScope, "saveDiscipline");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "saveDiscipline");
            }, function errorCallback(response) {
                callingScope.result = { "result": "failure", "error": "Server error: " + response.statusText };
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveDiscipline", response);
                authFactory.failDataLoad(callingScope, "saveDiscipline");
            });
    };

 //========================== Field Editing ===============================


    //  Save Field Function
    //  Takes modified Field object and sends to admin.php for update
    authFactory.saveField = function (callingScope, fieldInfo) {
        // type = SaveField
        fullRequest = requestBase + "type=SaveField";
        var data = JSON.stringify(fieldInfo);
        authFactory.startDataLoad(callingScope, "saveField");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "saveField");
            }, function errorCallback(response) {
                callingScope.result = { "result": "failure", "error": "Server error: " + response.statusText };
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveField", response);
                authFactory.failDataLoad(callingScope, "saveField");
            });
    }

    //========================== Trade Functions =================================


    /*
        Get Completed Trades by Division
    */
    authFactory.getCompletedTrades = function (callingScope, divisionName) {
        request = "CompletedTrades&division=" + divisionName;
        authFactory.startDataLoad(callingScope, "getCompletedTrades");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.completedTrades = response.data;
                // Utilities.log(response.data);
                authFactory.finishDataLoad(callingScope, "getCompletedTrades");
            }, function errorCallback(response) {
                authFactory.reportError("getCompletedTrades", response);
                authFactory.failDataLoad(callingScope, "getCompletedTrades");
            });
    }
    /*
        Get Active Trades by Division
    */
    authFactory.getActiveTrades = function (callingScope, divisionName) {
        request = "ActiveTrades&division=" + divisionName;
        authFactory.startDataLoad(callingScope, "getActiveTrades");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.activeTrades = response.data;
                authFactory.finishDataLoad(callingScope, "getActiveTrades");
            }, function errorCallback(response) {
                authFactory.reportError("getActiveTrades", response);
                authFactory.failDataLoad(callingScope, "getActiveTrades");
            });
    }

    authFactory.saveTrade = function (callingScope, newTrade) {
        fullRequest = requestBase + "type=SaveTrade";
        var data = JSON.stringify(newTrade);
        authFactory.startDataLoad(callingScope, "saveTrade");
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "saveTrade");
            }, function errorCallback(response) {
                callingScope.result = { "result": "failure", "error": "Server error: " + response.statusText };
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveTrade", response);
                authFactory.failDataLoad(callingScope, "saveTrade");
            });
    }

    authFactory.approveTrade = function (callingScope, tradeId, btnId) {
        // type=ApproveTrade&tradeId=555&btnId=703;
        request = "ApproveTrade&tradeId=" + tradeId + "&btnId=" + btnId;
        authFactory.startDataLoad(callingScope, "ApproveTrade");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.assignResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "ApproveTrade");
            }, function errorCallback(response) {
                callingScope.assignResult = { "result": "failure", "error": "Server error: " + response.message };
                authFactory.reportError("ApproveTrade", response);
                authFactory.failDataLoad(callingScope, "ApproveTrade");
            });
    }

    //========================== Roster Management ===============================

    authFactory.loadRoster = function (callingScope, teamId) {
        // type=LoadRoster
        request = "LoadRoster&team=" + teamId;
        authFactory.startDataLoad(callingScope, "loadRoster");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.roster = response.data[0];
            authFactory.finishDataLoad(callingScope, "loadRoster");
        }, function errorCallback(response) {
            authFactory.reportError("loadRoster", response);
            authFactory.failDataLoad(callingScope, "loadRoster");
        });
    }

    authFactory.saveNumbers = function (callingScope, saveList) {
        // type=SaveNumbers
        fullRequest = requestBase + "type=SaveNumbers";
        var data = JSON.stringify(saveList);
        authFactory.startDataLoad(callingScope, "saveNumbers");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                if (callingScope.result.error) {
                    callingScope.error = "Save failed. Reason: " + callingScope.result.error;
                } else {
                    callingScope.confirm = "Numbers successfully saved"
                }
                authFactory.finishDataLoad(callingScope, "saveNumbers");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.error = "Save failed. Reason: " + response.statusText;
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveNumbers", response);
                authFactory.failDataLoad(callingScope, "saveNumbers");
            });
    }

    authFactory.assignGM = function (callingScope, teamId, userId) {
        // type=AssignGM&userId=555&teamId=703;
        request = "AssignGM&userId=" + userId + "&teamId=" + teamId;
        authFactory.startDataLoad(callingScope, "assignGM");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.assignResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "assignGM");
            }, function errorCallback(response) {
                callingScope.assignResult = { "result": "failure", "error": "Server error: " + response.message};
                authFactory.reportError("assignGM", response);
                authFactory.failDataLoad(callingScope, "assignGM");
            });
    }

    //========================== Draft Functions ===============================

    authFactory.saveBibNumbers = function (callingScope, saveList) {
        // type=SaveBibNumbers
        fullRequest = requestBase + "type=SaveBibNumbers";
        var data = JSON.stringify(saveList);
        authFactory.startDataLoad(callingScope, "saveBibNumbers");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                if (callingScope.result.error) {
                    callingScope.error = "Save failed. Reason: " + callingScope.result.error;
                } else {
                    callingScope.confirm = "Bib numbers successfully saved"
                }
                authFactory.finishDataLoad(callingScope, "saveBibNumbers");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.error = "Save failed. Reason: " + response.message;
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("saveBibNumbers", response);
                authFactory.failDataLoad(callingScope, "saveBibNumbers");
            });
    }

    //========================== Schedule Functions ===============================

    authFactory.publishScheduleEdits = function (callingScope, changeList) {
        // type=EditSchedule
        fullRequest = requestBase + "type=EditSchedule";
        var data = angular.toJson(changeList);
        authFactory.startDataLoad(callingScope, "publishScheduleEdits");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                if (callingScope.result.error) {
                    callingScope.error = "Save failed. Reason: " + callingScope.result.error;
                } else {
                    callingScope.confirm = "Schedule Edits successfully saved"
                }
                authFactory.finishDataLoad(callingScope, "publishScheduleEdits");
            }, function errorCallback(response) {
                callingScope.status = "failed";
                callingScope.error = "Save failed. Reason: " + response.message;
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("publishScheduleEdits", response);
                authFactory.failDataLoad(callingScope, "publishScheduleEdits");
            });
    }

    authFactory.createPlayoffGame = function (callingScope, gameInfo) {
        // type=CreateGame
        fullRequest = requestBase + "type=CreateGame";
        var data = angular.toJson(gameInfo);
        authFactory.startDataLoad(callingScope, "publishScheduleEdits");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                if (callingScope.result.error) {
                    callingScope.error = "Game creation failed. Reason: " + callingScope.result.error;
                } else {
                    callingScope.confirm = "Playoff game successfully created"
                }
                authFactory.finishDataLoad(callingScope, "publishScheduleEdits");
            }, function errorCallback(response) {
                callingScope.result = "failed";
                callingScope.error = "Save failed. Reason: " + response.message;
                callingScope.errorDetails = response.statusText;
                authFactory.reportError("publishScheduleEdits", response);
                authFactory.failDataLoad(callingScope, "publishScheduleEdits");
            });
    }

    //========================== Taxi Functions ===============================

    authFactory.getTaxiRequests = function (callingScope, startDate, endDate) {
        // type=TaxiRequests&startDate=2016-08-25&endDate=2016-09-01
        request = "TaxiRequests"
        request += "&startDate=" + startDate.getFullYear() + "-" + (startDate.getMonth() + 1) + "-" + startDate.getDate();
        request += "&endDate=" + endDate.getFullYear() + "-" + (endDate.getMonth() + 1) + "-" + endDate.getDate();
        authFactory.startDataLoad(callingScope, "getTaxiRequests");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.requests = AggregateTaxiRequests(response.data);
            authFactory.finishDataLoad(callingScope, "getTaxiRequests");
        }, function errorCallback(response) {
            authFactory.reportError("getTaxiRequests", response);
            authFactory.failDataLoad(callingScope, "getTaxiRequests");
        });
    }

    authFactory.getTaxiDetails = function (callingScope, id, mode) {
        // type=TaxiDetails&requestId=987 OR &gameId=2131
        request = "TaxiDetails&id=" + id + "&mode=" + mode;
        authFactory.startDataLoad(callingScope, "getTaxiDetails");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.details = response.data;
            if (mode == "game") {
                FormatTaxiDetails(callingScope);
            }
            authFactory.finishDataLoad(callingScope, "getTaxiDetails");
        }, function errorCallback(response) {
            authFactory.reportError("getTaxiDetails", response);
            authFactory.failDataLoad(callingScope, "getTaxiDetails");
        });
    }

    authFactory.taxiCancel = function (callingScope, requestId, teamId) {
        // type=TaxiCancel&requestId=1000&teamId=905
        request = "TaxiCancel"
        request += "&requestId=" + requestId;
        request += "&teamId=" + teamId;
        authFactory.startDataLoad(callingScope, "taxiCancel");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.cancelResult = response.data[0];
            authFactory.finishDataLoad(callingScope, "taxiCancel");
        }, function errorCallback(response) {
            callingScope.cancelResult = {};
            callingScope.cancelResult.result = "failure";
            callingScope.cancelResult.error = "Server Error: " + response.message;
            authFactory.reportError("taxiCancel", response);
            authFactory.failDataLoad(callingScope, "taxiCancel");
        });
    }

    authFactory.taxiAssign = function (callingScope, requestId, taxiPoolId, catcher) {
        // type=TaxiAssign&requestId=1000&taxiPoolId=905&catcher=0
        request = "TaxiAssign"
        request += "&requestId=" + requestId;
        request += "&taxiPoolId=" + taxiPoolId;
        request += "&catcher=" + catcher;
        authFactory.startDataLoad(callingScope, "taxiAssign");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.assignResult = response.data[0];
                authFactory.finishDataLoad(callingScope, "taxiAssign");
            }, function errorCallback(response) {
                callingScope.assignResult = {};
                callingScope.assignResult.result = "failure";
                callingScope.assignResult.error = "Server Error: " + response.message;
                authFactory.reportError("taxiAssign", response);
                authFactory.failDataLoad(callingScope, "taxiAssign");
            });
    }

    authFactory.taxiRespond = function (callingScope, email, inviteId, token, responseText) {
        fullRequest = requestBase + "type=TaxiRespond";
        var data = { "email": email, "token": token, "inviteId": inviteId };
        if (responseText != null) data.response = responseText;
        authFactory.startDataLoad(callingScope, "taxiRespond");
        $http({
            method: 'POST',
            url: fullRequest,
            data: ObjectToParams(data),  // pass in data as POST object
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
        .then(function successCallback(response) {
            callingScope.respondResult = response.data[0];
            authFactory.finishDataLoad(callingScope, "taxiRespond");
        }, function errorCallback(response) {
            callingScope.respondResult = {};
            callingScope.respondResult.result = "serverError";
            callingScope.respondResult.error = "Server Error: " + response.message;
            authFactory.reportError("taxiRespond", response);
            authFactory.failDataLoad(callingScope, "taxiRespond");
        });
    }

    authFactory.sendTaxiRequest = function (callingScope, requestDetails) {
        fullRequest = requestBase + "type=TaxiRequest";
        var data = angular.toJson(requestDetails);
        authFactory.startDataLoad(callingScope, "sendTaxiRequest");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as object
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.requestResult = response.data[0];
                if (callingScope.requestResult.error) {
                    callingScope.error = "Taxi Request failed. Reason: " + callingScope.requestResult.error;
                }
                authFactory.finishDataLoad(callingScope, "sendTaxiRequest");
            }, function errorCallback(response) {
                callingScope.requestResult = {};
                callingScope.requestResult.result = "failed";
                callingScope.requestResult.error = "Taxi request server error. Reason: " + response.statusText;
                callingScope.error = "Taxi request server error. Reason: " + response.statusText;
                authFactory.reportError("sendTaxiRequest", response);
                authFactory.failDataLoad(callingScope, "sendTaxiRequest");
            });
    }

    authFactory.getTaxiPlayers = function (callingScope, year, page, perPage) {
        // type=TaxiPlayers&year=2015&page=0&perPage=100
        if (perPage < 0) {
            perPage = 2000; // absolute limit
        }
        request = "TaxiPlayers";
        request += "&year=" + year;
        request += "&page=" + page;
        request += "&perPage=" + perPage;
        authFactory.startDataLoad(callingScope, "getTaxiPlayers");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.players.list = response.data;
            authFactory.finishDataLoad(callingScope, "getTaxiPlayers");
        }, function errorCallback(response) {
            authFactory.reportError("getTaxiPlayers", response);
            authFactory.failDataLoad(callingScope, "getTaxiPlayers");
        });
    };

    //====================== Image Upload Functions ===========================
    authFactory.uploadBracket = function (callingScope, divisionName, fd) {
        fullRequest = requestBase + "type=UploadBracket&divisionName=" + divisionName;
        //fullRequest = "https:pssbl.com/PHP/uploadImage.php";
        authFactory.startDataLoad(callingScope, "uploadBracket");
        $http({
          method: "POST",
          url: fullRequest,
          data: fd, // pass in form data as object
          headers: {'Content-Type': undefined}
        }).then(
          function successCallback(response) {
            callingScope.requestResult = response.data[0];
            if (callingScope.requestResult.error) {
                callingScope.error = "Bracket update failed. Reason: " +
                    callingScope.requestResult.error;
                callingScope.confirm = undefined;
            } else {
                callingScope.error = undefined;
                callingScope.confirm = callingScope.requestResult.result;
            }
            authFactory.finishDataLoad(callingScope, "uploadBracket");
          },
          function errorCallback(response) {
            callingScope.requestResult = response;
            callingScope.requestResult.result = "failed";
                callingScope.error = "Bracket update server error. Reason: " + response.statusText;
                callingScope.confirm = undefined;
            authFactory.reportError("uploadBracket", response);
            authFactory.failDataLoad(callingScope, "uploadBracket");
          }
        );
    }

    //========================== Test Functions ===============================

    authFactory.sendErrorReport = function (callingScope, errorInfo) {
        // type=Register (attempting to post as JSON data
        fullRequest = requestBase + "type=ErrorReport";
        var data = angular.toJson(errorInfo);
        authFactory.startDataLoad(callingScope, "sendErrorReport");
        // Should generalize this http call TODO
        $http({
            method: 'POST',
            url: fullRequest,
            data: data,  // pass in data as strings
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
        })
            .then(function successCallback(response) {
                callingScope.result = response.data[0];
                authFactory.finishDataLoad(callingScope, "sendErrorReport");
            }, function errorCallback(response) {
                callingScope.result = {};
                callingScope.result.error = response.message;
                authFactory.reportError("sendErrorReport", response);
                authFactory.failDataLoad(callingScope, "sendErrorReport");
            });
    }

    authFactory.testPermissions = function (callingScope) {

        // type=TestPerms;
        request = "TestPerms";

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "testPermissions");
        authFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.serverPerms = response.data;
            callingScope.serverPerms.objType = "serverPerms";
            authFactory.finishDataLoad(callingScope, "testPermissions");
        }, function errorCallback(response) {
            authFactory.reportError("testPermissions", response);
            authFactory.failDataLoad(callingScope, "testPermissions");
        });

    }

    authFactory.testServer = function (callingScope) {

        // type=TestServer;
        request = "TestServer";

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "testServer");
        authFactory.requestText(request)
        .then(function successCallback(response) {
            callingScope.info = response.data;
            authFactory.finishDataLoad(callingScope, "testServer");
        }, function errorCallback(response) {
            authFactory.reportError("testServer", response);
            authFactory.failDataLoad(callingScope, "testServer");
        });
    }

    authFactory.testSession = function (callingScope) {

        // type=TestSession;
        request = "TestSession";

        // Always return fresh result
        authFactory.startDataLoad(callingScope, "testSession");
        authFactory.requestText(request)
            .then(function successCallback(response) {
                callingScope.info = response.data;
                authFactory.finishDataLoad(callingScope, "testSession");
            }, function errorCallback(response) {
                authFactory.reportError("testSession", response);
                authFactory.failDataLoad(callingScope, "testSession");
            });
    }

    // Pass throughs to dataFactory
    authFactory.getPlayerName = dataFactory.getPlayerName;
    authFactory.getAllTeams = dataFactory.getAllTeams;

    return authFactory;

    //-------------------------------------------------------
    // Internal Functions to process returned data

    // javascript and angular do a lousy job of parsing the curveball time format, so here is a hack to
    // work around that - input is hh:mm:ss in 24 hour format.
    function formatDateTime(time) {
        if (time) {
            splitTime = time.split(":");
            if (splitTime.length > 1) {
                var timeVal = new Date();
                timeVal.setHours(splitTime[0], splitTime[1], 0);
                return timeVal;
            }
        }
        return undefined;
    }

    // Function needed to reformat object for http post
    function ObjectToParams(obj) {
        var p = [];
        for (var key in obj) {
            p.push(key + '=' + encodeURIComponent(obj[key]));
        }
        return p.join('&');
    }

    function RestoreUnsafe(text) {
        // TODO improved version needs to be moved to Utilities
        // Also this only replaces one instance each - need to fix
        var fullText = Utilities.replace("$$", "\n", text);
        fullText = Utilities.replace("$-$", "'", fullText);
        fullText = Utilities.replace('$=$', '"', fullText);
        return fullText;
    }

    // Issue: why not just stringify authFactory.login?
    function LoadAuthFromSession() {
        if (typeof (Storage) !== "undefined") {
            authFactory.login.userId = Number(sessionStorage.userId);
            authFactory.login.userName = sessionStorage.userName;
            authFactory.login.loggedIn = (sessionStorage.loggedIn == "true");
            authFactory.login.isAdmin = (sessionStorage.isAdmin == "true");
            authFactory.login.year = Number(sessionStorage.year);
            if (sessionStorage.permissions) {
                authFactory.login.permissions = JSON.parse(sessionStorage.permissions);
            }
            if (sessionStorage.teams) {
                authFactory.login.teams = JSON.parse(sessionStorage.teams);
            }
            Utilities.log(">> Permissions loaded from session storage");
        } else {
            Utilities.log("!! Browser does not support session storage");
        }
    }

    function SaveAuthToSession() {
        if (typeof (Storage) !== "undefined") {
            sessionStorage.userId = authFactory.login.userId;
            sessionStorage.userName = authFactory.login.userName;
            sessionStorage.loggedIn = authFactory.login.loggedIn;
            sessionStorage.isAdmin = authFactory.login.isAdmin;
            sessionStorage.year = authFactory.login.year;
            sessionStorage.permissions = JSON.stringify(authFactory.login.permissions);
            sessionStorage.teams = JSON.stringify(authFactory.login.teams);
            Utilities.log(">> Permissions saved to session storage");
        } else {
            Utilities.log("!! Browser does not support session storage");
        }
    }

    function ClearAuthFromSession() {
        if (typeof (Storage) !== "undefined") {
            sessionStorage.clear();
            Utilities.log(">> Permissions cleared from session storage");
        }
    }

    function AggregateTaxiRequests(rawRequests) {
        var returnArray = [];
        var newRequest = undefined;
        var lastRequestId = -1;
        for (var i = 0; i < rawRequests.length; i++) {
            requestObj = rawRequests[i];
            if (requestObj.requestId != lastRequestId) {
                newRequest = {};
                newRequest.id = requestObj.requestId;
                newRequest.division = requestObj.divisionName;
                newRequest.gameId = requestObj.gameId;
                var gameDetails = requestObj.awayName + " @ " + requestObj.homeName + ", ";
                var gameDateTime = new Date(requestObj.startTime);
                gameDetails += (gameDateTime.getMonth() + 1) + "/" + gameDateTime.getDate() + "/" + gameDateTime.getFullYear().toString().substr(-2) + " ";
                gameDetails += FormatAmPmTime(gameDateTime) + " ";
                gameDetails += requestObj.fieldName;
                newRequest.gameDetails = gameDetails;
                newRequest.requestor = requestObj.requestor;
                newRequest.requestTeam = requestObj.requestTeam;
                newRequest.requestTime = new Date(requestObj.requestTime);
                newRequest.players = requestObj.players;
                newRequest.catchers = requestObj.catchers;
                newRequest.gear = requestObj.gear;
                newRequest.closed = requestObj.closed;
                newRequest.accepted = 0;
                newRequest.declined = 0;
                newRequest.pending = 0;
                returnArray.push(newRequest);
                lastRequestId = requestObj.requestId;
            }
            if (requestObj.status == "accepted") newRequest.accepted = requestObj.total;
            if (requestObj.status == "declined") newRequest.declined = requestObj.total;
            if (requestObj.status == "pending") newRequest.pending = requestObj.total;
        }
        return returnArray;
    }

    function FormatTaxiDetails(gameObject) {
        // We will need this to work for both game-controller and division-controller,
        // but for now, detect the difference and only handle division-controller
        if (!gameObject.awayTaxi && !gameObject.homeTaxi) return;
        var taxi = gameObject.taxi;
        // taxi.info is a sparse array with two entries (home and away indices)
        taxi.info = [];
        var homeInfo = {};
        homeInfo.teamName = gameObject.homeName;
        homeInfo.summary = "No Taxi Pool Requests for " + homeInfo.teamName;
        homeInfo.requests = [];
        taxi.info[gameObject.homeId] = homeInfo;
        var awayInfo = {};
        awayInfo.teamName = gameObject.awayName;
        awayInfo.summary = "No Taxi Pool Requests for " + awayInfo.teamName;
        awayInfo.requests = [];
        taxi.info[gameObject.awayId] = awayInfo;
        // Now we loop through all of the taxi request data and build the data lists
        var lastRequestId = -1;
        var currentRequest = null;
        for (var i = 0; i < gameObject.details.length; i++) {
            var response = gameObject.details[i];
            // Is this new or a continuation of current request?
            if (response.requestId != lastRequestId) {
                var newRequest = response;  // To capture detailed information
                var teamInfo = taxi.info[response.teamId];
                teamInfo.requests.push(newRequest);
                var requestCount = teamInfo.requests.length;
                if (requestCount == 1) {
                    teamInfo.summary = "1 Taxi Pool Request for " + teamInfo.teamName;
                } else {
                    teamInfo.summary = requestCount + " Taxi Pool Requests for " + teamInfo.teamName;
                }
                newRequest.accepted = 0;
                newRequest.declined = 0;
                newRequest.blocked = 0;
                newRequest.pending = 0;
                newRequest.accepts = [];
                currentRequest = newRequest;
                lastRequestId = response.requestId;
            }
            // Update statistics based on response
            if (response.status == "pending") currentRequest.pending++;
            if (response.status == "declined") currentRequest.declined++;
            if (response.status == "blocked") currentRequest.blocked++;
            if (response.status == "accepted") {
                currentRequest.accepted++;
                // Add to accept list if this is an acceptance
                var acceptText = response.responder + " accepted ";
                if (response.catcher == 1) acceptText += " (as catcher) ";
                acceptText += "on " + response.responseTime;
                currentRequest.accepts.push(acceptText);
            }
        }
    }


    function FormatAmPmTime(dateTime) {
        // Dont worry about 12 AM
        var hours = dateTime.getHours();
        var minutes = dateTime.getMinutes();
        var out = (hours > 12) ? hours - 12 : hours;
        out += (minutes > 0) ? ":" + minutes : "";
        out += (hours > 11) ? "pm" : "am";
        return out;
    }

    // {"requestId":895,"divisionName":"Teton","homeName":"Seattle Diamonds","awayName":"Diablos","startTime":"Sep 01 2016, 7:00 PM",
    // "fieldName":"Russell Road","requestor":"Mari-Jo (Steiner) Fraser","requestTeam":"Seattle Diamonds","requestTime":"Apr 22 2017, 11:25 AM","players":1,"catchers":0,"gear":1,"closed":1,"status":"declined","total":3}
    // Adirondack	Bees @ Generals, 5/15/17 7:00 PM Kent Memorial Park	Bob Sorensen	2 / 0 / No	4/29/17 3:53 PM	1 : 2 : 23
});