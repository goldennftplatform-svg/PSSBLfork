app.factory('dataFactory', function ($http, $q) {

    var dataFactory = {};

    // The goal is to load config settings from an external file. However, this is an asynchronous operation and there are too
    // many things that could break if they are called before initialization is complete. Therefore I am hard-coding this for now
    // and will revisit when I have more time.
    dataFactory.config = {};

    dataFactory.configure = function (site) {
        switch (site) {
            case "PSSBL.COM":
                dataFactory.requestBase = 'https://pssbl.com/PHP/fetchData.php?';
                dataFactory.authBase = 'https://pssbl.com/PHP/admin.php?';
                dataFactory.payBase = 'https://pssbl.com/PHP/payment.php?';
                dataFactory.supportBase = 'https://pssbl.com/PHP/support.php?';
                Utilities.enableLogging(false);
                break;
            case "BETA":
                dataFactory.requestBase = 'https://beta.pssbl.com/PHP/fetchData.php?';
                dataFactory.authBase = 'https://beta.pssbl.com/PHP/admin.php?';
                dataFactory.payBase = 'https://beta.pssbl.com/PHP/payment.php?';
                dataFactory.supportBase = 'https://beta.pssbl.com/PHP/support.php?';

                Utilities.enableLogging(true);
                break;
            case "PSSBL.NET":
                dataFactory.requestBase = 'http://www.pssbl.net/PHP/fetchData.php?';
                dataFactory.authBase = 'http://www.pssbl.net/PHP/admin.php?';
                dataFactory.payBase = 'http://www.pssbl.net/PHP/payment.php?';
                Utilities.enableLogging(true);
                break;
            case "TEST":
                dataFactory.requestBase =
                  "https://pssbl.richbonny.space/PHP/fetchData.php?";
                dataFactory.authBase =
                  "https://pssbl.richbonny.space/PHP/admin.php?";
                dataFactory.payBase =
                  "https://pssbl.richbonny.space/PHP/payment.php?";
                Utilities.enableLogging(true);
                break;
        }
    }
    // Temporary configuration method - would like to auto-detect
    dataFactory.configure("PSSBL.COM");  // *REVIEW*
    //======================================================

    /*
        All Variables that change from season to season should go here. Some of this may be redundant with  database entries, but by placing them here,
        server calls are not required. There is similar PHP seasonal dependent code in commonFunctions.php and some information in the database may also change
        from year to year.
    */
    dataFactory.season = {};
    dataFactory.season.firstYear = 2006;
    dataFactory.season.currentYear = 2026;
    dataFactory.season.firstUmpireYear = 2014;
    dataFactory.season.firstBillingYear = 2014;
    dataFactory.season.draftDate = new Date("March 28, 2026 18:00:00");
    dataFactory.season.draftHeld = "on March 28th";
    dataFactory.season.paymentDue = "March 27th";
    dataFactory.season.newPlayerCost = "$630.90";
    dataFactory.season.additionalCost = "$460.90";
    dataFactory.season.baseDues = "$170";
    dataFactory.season.scheduleMessage = "2026 Season Begins May 1st";
    dataFactory.season.playoffCutoffDate = "July 31st";

    // function to generate array of years for populating drop boxes
    dataFactory.yearsSince = function (startYear, skipCurrent) {
        var yearList = [];
        var year = dataFactory.season.currentYear;
        if (skipCurrent) year--;
        while (year >= startYear) {
            yearList.push(year--);
        }
        return yearList;
    }

    //-----------------------------     End of Hard Coded Config       ------------------------------

    var requestBase = dataFactory.requestBase;
    var firstYear = dataFactory.season.firstYear;
    var currentYear = dataFactory.season.currentYear;
    Utilities.log("Loading dataFactory...");
    // loadConfig();

    // A cached map of references from teamIds to team names and division names is maintained here
    // and updated each time a new year is added to the collection.
    dataFactory.teamNames = {};
    dataFactory.teamYearsLoaded = {};
    dataFactory.teamDivisions = {};

    // cached values that are only returned once
    dataFactory.fieldCount = null;
    dataFactory.shortFieldNames = null;

    // Content lists
    dataFactory.content = {};
    dataFactory.content.library = null;
    dataFactory.content.blogList = null;
    dataFactory.content.pageContents = [];
    dataFactory.content.currentPageContents = {};

    // Draft Info cached here
    dataFactory.draft = {};

    //===== This is the basic call to submit a query ======
    dataFactory.requestHttp = function (request) {
        fullRequest = requestBase + "type=" + request;
        Utilities.log("!dataFactory >> " + fullRequest);
        return $http.get(fullRequest);
    }

    //===== This version uses the post method and passes data in a JSON string ======
    dataFactory.requestHttpPost = function (request, dataObject) {
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

    //===== Generic http file load routine ======
    // TODO: Clean up and consolidate all related functions
    dataFactory.loadHttp = function (loadObject, fileBase) {

        var fileName = 'data/articles/' + fileBase + ".html";
        $http.get(fileName)
            .then(function successCallback(response) {
                loadObject.html = response.data;
                Utilities.log("Fetched article of size =" + response.data.length);
            }, function errorCallback(response) {
                dataFactory.reportError("loadHttp", response);
                loadObject.html = "";
            });
    }

    // Present text data as a downloaded file
    // Highly browser specific
    dataFactory.downloadAsFile = function (text, filename) {
        // Use different method for Edge and IE
        if (window.navigator.msSaveOrOpenBlob) {
            var blob = new Blob([text]);
            window.navigator.msSaveOrOpenBlob(blob, filename);
        } else {
            var anchor = angular.element('<a/>');
            var encodeText = encodeURIComponent(text);
            anchor.attr({
                href: 'data:attachment/csv;charset=utf-8,' + encodeText,
                target: '_blank',
                download: filename
            });
            document.body.appendChild(anchor[0]);
            anchor[0].click();
            anchor[0].remove();
        }
    }

    dataFactory.reportError = function (source, response) {
        Utilities.log("!!! http error calling " + source + ": " + response.status + " = " + response.statusText);
    }

    // TODO: Create base routines for http POST calls

    //-------------------------------------------------------
    // Functions to monitor data loading

    dataFactory.startDataLoad = function (callingScope, functionName) {
        Utilities.log("--- start load: " + functionName);
        callingScope.loadingData = true;
    }

    dataFactory.finishDataLoad = function (callingScope, functionName) {
        Utilities.log("--- finish load: " + functionName);
        callingScope.loadingData = false;
    }

    dataFactory.failDataLoad = function (callingScope, functionName) {
        Utilities.log("--- failed to load: " + functionName);
        callingScope.loadingData = false;
    }

    //========================== config Loading ===============================

    // Ignoring until I can reliably deal with the asyncronous loading of configuration data
    function loadConfig() {
        // Temp load from json file
        Utilities.log("Loading config data ...");
        $http.get('data/config.json')
            .then(function successCallback(response) {
                config = response.data;
                dataFactory.requestBase = config.requestBase;
                dataFactory.season.firstYear = config.firstYear;
                dataFactory.season.currentYear = config.defaultYear;
                if (config.loggingEnabled !== undefined) Utilities.enableLogging(config.loggingEnabled);
                dataFactory.config = config;
                Utilities.log("Configuration file loaded");
            }, function errorCallback(response) {
                dataFactory.reportError("loadConfig", response);
            });
    };

    //========================== ARTICLES AND BLOG ===============================

    dataFactory.getArticleHtml = function (callingScope, contentId) {
        // Direct load of Html: no SQL
        var fileName = 'data/articles/' + contentId + ".html";
        $http.get(fileName)
            .then(function successCallback(response) {
                callingScope.html = response.data;
            }, function errorCallback(response) {
                callingScope.html = "<img src='img/sorry.gif'><h2>The article you requested could not be found</h2>";
            });
    };

    dataFactory.getHistoryHtml = function (callingScope, divisionName) {
      // Direct load of Html: no SQL
      var fileName = "data/history/" + divisionName + ".html";
      $http.get(fileName).then(
        function successCallback(response) {
          callingScope.html = response.data;
        },
        function errorCallback(response) {
          callingScope.html =
            "<img src='img/sorry.gif'><h2>The article you requested could not be found</h2>";
        }
      );
    };
    
    dataFactory.getMessageHtml = function (callingScope, messageId) {
        // Direct load of Html: no SQL
        var fileName = 'data/messages/' + messageId + ".html";
        $http.get(fileName)
            .then(function successCallback(response) {
                callingScope.html = response.data;
            }, function errorCallback(response) {
                callingScope.html = "<img src='img/sorry.gif'><h2>The message you requested could not be found</h2>";
            });
    };

    // This loads the library file with descriptors of content
    dataFactory.loadContentLibrary = function (callingScope, allowCached) {
        // Whichever way we loaded, need to trigger watch function (by setting libraryLoaded)
        if (allowCached && dataFactory.content.library) {
            if (callingScope) callingScope.library = dataFactory.content.library;
            Utilities.log("!dataCache >> library already set");
            callingScope.libraryLoaded = (new Date()).getMilliseconds();
        } else {
            // Get from json file (Might eventually move to database)
            $http.get('data/library.json')
                .then(function successCallback(response) {
                    dataFactory.content.library = response.data;
                    if (callingScope) callingScope.library = dataFactory.content.library;
                    callingScope.libraryLoaded = (new Date()).getMilliseconds();
                }, function errorCallback(response) {
                    dataFactory.reportError("loadContentLibrary", response);
                    callingScope.libraryLoaded = (new Date()).getMilliseconds();
                });
        }
    }

    // The blog list is now constructed from the content library
    dataFactory.createBlogList = function (library) {
        var blogList = [];
        if (library) {
            for (var index = 0; index < library.length; index++) {
                var libraryItem = library[index];
                if (libraryItem.blogPage) {
                    if (!blogList[libraryItem.blogPage - 1]) blogList[libraryItem.blogPage - 1] = [];
                    var blogPage = blogList[libraryItem.blogPage - 1];
                    blogPage[libraryItem.pageIndex] = libraryItem;
                }
            }
        }
        return blogList;
    }

    dataFactory.getBlogArticle = function (article) {
        // Seems to be called when null - check out
        if (!article) {
            Utilities.log("!!! getBlogArticle called with undefined article");
            return;
        }
        // Load article from file
        var fileName = 'data/articles/' + article.contentId;
        if (article.hasTeaser) fileName += "-teaser";
        fileName += ".html";
        $http.get(fileName)
            .then(function successCallback(response) {
                article.html = response.data;
                Utilities.log("Fetched article" + fileName + " of size =" + response.data.length);
            }, function errorCallback(response) {
                article.html = "<h2>The article you requested could not be found</h2>";
            });
    }

    dataFactory.getArticleInfo = function (contentId) {
        var foundArticle = null;
        if (dataFactory.content && dataFactory.content.library) {
            for (var i = 0; i < dataFactory.content.library.length; i++) {
                article = dataFactory.content.library[i];
                if (article.contentId == contentId) {
                    foundArticle = article;
                    break;
                }
            }
        }
        return foundArticle;
    }

    //========================== Ads ===============================

    dataFactory.getAds = function (callingScope) {
        // Temp load from json file
        $http.get('data/adList.json')
            .then(function successCallback(response) {
                callingScope.adList = response.data;
                callingScope.initAds();
            }, function errorCallback(response) {
                dataFactory.reportError("getAds", response);
            });
    };

    dataFactory.getMarketAds = function (callingScope) {
        // Temp load from json file
        $http.get('data/marketList.json')
            .then(function successCallback(response) {
                callingScope.marketAds = response.data;
            }, function errorCallback(response) {
                dataFactory.reportError("getMarketAds", response);
            });
    };
    //========================== FIELDS ===============================

    dataFactory.getFieldCount = function (callingScope) {
        // type=FieldCount
        // FETCH ONCE
        if (callingScope.fieldCount) {
            Utilities.log("!dataCache >> fieldCount already set");
        } else if (dataFactory.fieldCount) {
            Utilities.log("!dataCache >> fieldCount set from cache");
            callingScope.fieldCount = dataFactory.fieldCount;
        } else {
            dataFactory.requestHttp("FieldCount")
                .then(function successCallback(response) {
                    callingScope.fieldCount = response.data;
                    dataFactory.fieldCount = response.data;
                }, function errorCallback(response) {
                    dataFactory.reportError("getFieldCount", response);
                });
        }
    }

    dataFactory.getFieldProviders = function (callingScope) {
        // type=FieldProviders
        dataFactory.startDataLoad(callingScope, "FieldProviders");
        dataFactory.requestHttp("FieldProviders")
            .then(function successCallback(response) {
                callingScope.fieldProviders = response.data;
                dataFactory.finishDataLoad(callingScope, "FieldProviders");
            }, function errorCallback(response) {
                callingScope.loadingData = false;
                dataFactory.reportError("FieldProviders", response);
                dataFactory.failDataLoad(callingScope, "FieldProviders");
            });
    }

    dataFactory.getFields = function (callingScope, page, perPage, fieldId) {
        // type=Fields&page=1&perPage=20
        if (perPage < 0) {
            perPage = 500; // absolute limit
        }
        request = "Fields";
        if (fieldId) {
            request += "&fieldId=" + fieldId;
        } else {
            request += "&page=" + page;
            request += "&perPage=" + perPage;
        }

        // Always return fresh result
        dataFactory.startDataLoad(callingScope, "getFields");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.fields = response.data;
                dataFactory.finishDataLoad(callingScope, "getFields");
            }, function errorCallback(response) {
                callingScope.loadingData = false;
                dataFactory.reportError("getFields", response);
                dataFactory.failDataLoad(callingScope, "getFields");
            });
    }

    dataFactory.getFieldInfo = function (callingScope, fieldId) {
        // type=FieldInfo&fieldId=21
        request = "FieldInfo&fieldId=" + fieldId;

        // Always return fresh result
        dataFactory.startDataLoad(callingScope, "getFieldInfo");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                var fieldInfo = response.data[0]; // extract single object
                fieldInfo.mapLink = "http://maps.google.com/maps?q=loc:" + fieldInfo.coords;
                //fieldInfo.staticMap = "https://maps.googleapis.com/maps/api/staticmap?center=" + fieldInfo.coords + "&markers=color:red|" + fieldInfo.coords + "&size=500x300&zoom=14&sensor=false&key=AIzaSyDkbwZPhwKwv5hyEJSEs4yXRP9q_KOdAMQ";
                fieldInfo.staticMap = "https://maps.googleapis.com/maps/api/staticmap?center=" + fieldInfo.coords + "&markers=color:red|" + fieldInfo.coords + "&size=500x300&zoom=14&sensor=false&key=AIzaSyCZE14WtfUDwEban35wJWWzqUOcG13M1Cc";
                if (fieldInfo.lightsOutTime) fieldInfo.lightsOutTime = formatDateTime(fieldInfo.lightsOutTime);
                fieldInfo.notesList = extractNotesList(fieldInfo.notes);
                callingScope.fieldInfo = fieldInfo;
                dataFactory.finishDataLoad(callingScope, "getFieldInfo");
            }, function errorCallback(response) {
                dataFactory.reportError("getFieldInfo", response);
                dataFactory.failDataLoad(callingScope, "getFieldInfo");
            });
    }

    dataFactory.getShortFieldNames = function (callingScope) {
        // type=ShortFieldNames
        // FETCH ONCE
        if (callingScope.shortFieldNames) {
            Utilities.log("!dataCache >> shortFieldNames already set");
        } else if (dataFactory.shortFieldNames) {
            Utilities.log("!dataCache >> shortFieldNames set from cache");
            callingScope.shortFieldNames = dataFactory.shortFieldNames;
        } else {
            dataFactory.requestHttp("ShortFieldNames")
                .then(function successCallback(response) {
                    callingScope.shortFieldNames = response.data[0]; // return single object
                    dataFactory.shortFieldNames = response.data[0];
                }, function errorCallback(response) {
                    dataFactory.reportError("getShortFieldNames", response);
                });
        }
    }

    dataFactory.getShortFieldName = function (fieldId) {
        var key = "F" + fieldId;
        if (dataFactory.shortFieldNames) {
            return dataFactory.shortFieldNames[key];
        } else {
            return "Field " + fieldId;
        }
    }

    //========================== PLAYERS ===============================

    dataFactory.getPlayerName = function (callingScope, playerId) {
        // type=PlayerName&playerId=666
        request = "PlayerName&playerId=" + playerId;

        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                // some inconsistency that needs to be fixed, but for now, set both playerName and userName
                callingScope.playerName = response.data[0]; // Simple string
                callingScope.userName = callingScope.playerName;
            }, function errorCallback(response) {
                dataFactory.reportError("getPlayerName", response);
            });
    };

    dataFactory.getRegisteredPlayers = function (callingScope, year, page, perPage) {
        // type=RegisteredPlayers&year=2015&page=0&perPage=100
        if (perPage < 0) {
            perPage = 2000; // absolute limit
        }
        request = "RegisteredPlayers";
        request += "&year=" + year;
        request += "&page=" + page;
        request += "&perPage=" + perPage;
        dataFactory.startDataLoad(callingScope, "getRegisteredPlayers");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.players = response.data;
                dataFactory.finishDataLoad(callingScope, "getRegisteredPlayers");
            }, function errorCallback(response) {
                dataFactory.reportError("getRegisteredPlayers", response);
                dataFactory.failDataLoad(callingScope, "getRegisteredPlayers");
            });
    };

    dataFactory.getTaxiPlayers = function (callingScope, year, page, perPage) {
        // type=RegisteredPlayers&year=2015&page=0&perPage=100
        if (perPage < 0) {
            perPage = 2000; // absolute limit
        }
        request = "TaxiPlayers";
        request += "&year=" + year;
        request += "&page=" + page;
        request += "&perPage=" + perPage;
        dataFactory.startDataLoad(callingScope, "getTaxiPlayers");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.taxiPlayers = response.data;
                dataFactory.finishDataLoad(callingScope, "getTaxiPlayers");
            }, function errorCallback(response) {
                dataFactory.reportError("getTaxiPlayers", response);
                dataFactory.failDataLoad(callingScope, "getTaxiPlayers");
            });
    };

    dataFactory.getDraftPlayers = function (callingScope, year, page, perPage) {
        // type=DraftPlayers&year=2015&page=0&perPage=100
        if (perPage < 0) {
            perPage = 2000; // absolute limit
        }
        request = "DraftPlayers";
        request += "&year=" + year;
        request += "&page=" + page;
        request += "&perPage=" + perPage;
        dataFactory.startDataLoad(callingScope, "getDraftPlayers");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.draftPlayers = response.data;
                dataFactory.finishDataLoad(callingScope, "getDraftPlayers");
            }, function errorCallback(response) {
                dataFactory.reportError("getDraftPlayers", response);
                dataFactory.failDataLoad(callingScope, "getDraftPlayers");
            });
    };

    dataFactory.getDraftProfile = function (callingScope, poolId) {
        // type=DraftProfile&poolId=567
        request = "DraftProfile&poolId=" + poolId;
        dataFactory.startDataLoad(callingScope, "getDraftProfile");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.player = response.data[0];
                dataFactory.finishDataLoad(callingScope, "getDraftProfile");
            }, function errorCallback(response) {
                dataFactory.reportError("getDraftProfile", response);
                dataFactory.failDataLoad(callingScope, "getDraftProfile");
            });
    };

    dataFactory.getFreeAgentClaims = function (callingScope, poolId) {
        // type=FreeAgentClaims&poolId=567
        request = "FreeAgentClaims&poolId=" + poolId;
        dataFactory.startDataLoad(callingScope, "getFreeAgentClaims");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.claim = response.data;
                dataFactory.finishDataLoad(callingScope, "getFreeAgentClaims");
            }, function errorCallback(response) {
                dataFactory.reportError("getFreeAgentClaims", response);
                dataFactory.failDataLoad(callingScope, "getFreeAgentClaims");
            });
    };

    dataFactory.getFreeAgentPlayers = function (callingScope, year, page, perPage, status) {
        // type=FreeAgentPlayers&year=2015&page=0&perPage=100
        if (perPage < 0) {
            perPage = 2000; // absolute limit
        }
        request = "FreeAgentPlayers";
        request += "&status=" + status;
        request += "&year=" + year;
        request += "&page=" + page;
        request += "&perPage=" + perPage;
        dataFactory.startDataLoad(callingScope, "getFreeAgentPlayers");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.freeAgent = response.data;
                dataFactory.finishDataLoad(callingScope, "getFreeAgentPlayers");
            }, function errorCallback(response) {
                dataFactory.reportError("getFreeAgentPlayers", response);
                dataFactory.failDataLoad(callingScope, "getFreeAgentPlayers");
            });
    };

    dataFactory.getFreeAgentProfile = function (callingScope, poolId) {
        // type=FreeAgentProfile&poolId=567
        request = "FreeAgentProfile&poolId=" + poolId;
        dataFactory.startDataLoad(callingScope, "getFreeAgentProfile");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.player = response.data[0];
                dataFactory.finishDataLoad(callingScope, "getFreeAgentProfile");
            }, function errorCallback(response) {
                dataFactory.reportError("getFreeAgentProfile", response);
                dataFactory.failDataLoad(callingScope, "getFreeAgentProfile");
            });
    };

    dataFactory.getPlayerCount = function (callingScope, year, tableType) {
        // type=PlayerCount&year=2015&table=PlayerRegistrations
        request = "PlayerCount";
        request += "&year=" + year;
        request += "&table=" + tableType;
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.playerCount = response.data;
            }, function errorCallback(response) {
                dataFactory.reportError("getPlayerCount", response);
            });
    };

    dataFactory.getRoster = function (callingScope, teamId) {
        // type=Roster&teamId=669
        request = "Roster&teamId=" + teamId;
        dataFactory.startDataLoad(callingScope, "getRoster");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.roster = response.data;
                callingScope.rosterLoaded = true;
                dataFactory.finishDataLoad(callingScope, "getRoster");
            }, function errorCallback(response) {
                dataFactory.reportError("getRoster", response);
                dataFactory.failDataLoad(callingScope, "getRoster");
            });
    };

    dataFactory.getTaxiRoster = function (callingScope, teamId, gameId) {
        // type=TaxiRoster&teamId=669&gameId=15572
        request = "TaxiRoster&teamId=" + teamId + "&gameId=" + gameId;
        dataFactory.startDataLoad(callingScope, "getTaxiRoster");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.taxi = response.data;
                callingScope.taxiLoaded = true;
                dataFactory.finishDataLoad(callingScope, "getTaxiRoster");
            }, function errorCallback(response) {
                dataFactory.reportError("getTaxiRoster", response);
                dataFactory.failDataLoad(callingScope, "getTaxiRoster");
            });
    };

    
    dataFactory.getDayPlayers = function (callingScope) {
      // type=DayPlayers
      request = "DayPlayers";
      dataFactory.startDataLoad(callingScope, "getDayPlayers");
      dataFactory.requestHttp(request).then(
        function successCallback(response) {
          callingScope.players = response.data;
          callingScope.playersLoaded = true;
          dataFactory.finishDataLoad(callingScope, "getDayPlayers");
        },
        function errorCallback(response) {
          dataFactory.reportError("getDayPlayers", response);
          dataFactory.failDataLoad(callingScope, "getDayPlayers");
        }
      );
    };

    //========================== DIVISIONS ===============================
    /*
        get Divisions by year
    */

    dataFactory.getDivisions = function (callingScope, year) {
        request = "Divisions&year=" + year;
        dataFactory.startDataLoad(callingScope, "getDivisions");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.divisions = response.data;
                callingScope.gotDivisions = true;
                dataFactory.finishDataLoad(callingScope, "getDivisions");
            }, function errorCallback(response) {
                dataFactory.reportError("getDivisions", response);
                dataFactory.failDataLoad(callingScope, "getDivisions");
            });
    }

    dataFactory.getDivisionNames = function (callingScope, year) {
        request = "DivisionNames"
        if (year) request += "&year=" + year;
        callingScope.divisionNamesLoaded = false;
        dataFactory.startDataLoad(callingScope, "getDivisionNames");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.divisions = response.data;
                callingScope.divisionNamesLoaded = true;
                dataFactory.finishDataLoad(callingScope, "getDivisionNames");
            }, function errorCallback(response) {
                dataFactory.reportError("getDivisionNames", response);
                dataFactory.failDataLoad(callingScope, "getDivisionNames");
            });
    }

    /*
        get Division Teams by year
    */

    dataFactory.getDivisionTeams = function (callingScope, year, divisionName) {
        request = "Division&year=" + year + "&division=" + divisionName;
        dataFactory.startDataLoad(callingScope, "getDivisionTeams");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                divisionData = response.data;
                callingScope.teams = mergeDivisionData(divisionData);
                dataFactory.finishDataLoad(callingScope, "getDivisionTeams");
            }, function errorCallback(response) {
                dataFactory.reportError("getDivisions", response);
                dataFactory.failDataLoad(callingScope, "getDivisionTeams");
            });
    }

    //========================== TEAMS ===============================
    /*
        getTeams gets teams by division, although if teamName is provided,
        returns just the one team.
        fetchData.php?type=Team&year=2015&division=adirondack&teamName=Bees
    */

    dataFactory.getTeams = function (callingScope, year, division, teamName) {
        request = "Teams";
        request += "&year=" + year;
        request += "&division=" + division;
        if (teamName) request += "&teamName=" + teamName;
        dataFactory.startDataLoad(callingScope, "getTeams");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.teams = response.data;
                dataFactory.finishDataLoad(callingScope, "getTeams");
            }, function errorCallback(response) {
                dataFactory.reportError("getTeams", response);
                dataFactory.failDataLoad(callingScope, "getTeams");
            });
    }

    /*
        There is some redundancy here and some refactoring may be in order, but for now
        getAllTeams serves a separate purpose to support permissions functions
     */

    dataFactory.getAllTeams = function (callingScope, year) {
        request = "AllTeams";
        if (year) request += "&year=" + year;
        dataFactory.startDataLoad(callingScope, "getAllTeams");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.teams = response.data;
                callingScope.gotTeams = true;
                dataFactory.finishDataLoad(callingScope, "getAllTeams");
            }, function errorCallback(response) {
                dataFactory.reportError("getAllTeams", response);
                dataFactory.failDataLoad(callingScope, "getAllTeams");
            });

    }

    /*
        loadTeamsNames gets the full list of team names, ids, division ids, and
        division names for a given year. This is cached to build out schedule info.
        The cross reference table is maintained here and accessed via public functions
    */

    dataFactory.loadTeamNames = function (callingScope, year) {
        // type=TeamNames&year=2015
        // FETCH ONCE (per year; maintain updated list)
        if (dataFactory.teamYearsLoaded[year]) {
            Utilities.log("!dataCache >> teamNames set from cache");
            callingScope.yearLoaded = year;
        } else {
            dataFactory.startDataLoad(callingScope, "loadTeamNames");
            dataFactory.requestHttp("TeamNames&year=" + year)
                .then(function successCallback(response) {
                    addTeamNames(response.data);
                    dataFactory.teamYearsLoaded[year] = true;
                    callingScope.yearLoaded = year;
                    dataFactory.finishDataLoad(callingScope, "loadTeamNames");
                }, function errorCallback(response) {
                    dataFactory.reportError("loadTeamNames", response);
                    dataFactory.failDataLoad(callingScope, "loadTeamNames");
                });
        }
    }

    dataFactory.getTeamName = function (teamId) {
        if (dataFactory.teamNames[teamId]) {
            return dataFactory.teamNames[teamId].teamName;
        } else {
            return "Team#" + teamId;
        }
    }

    dataFactory.getShortName = function (teamId) {
        if (dataFactory.teamNames[teamId]) {
            return dataFactory.teamNames[teamId].shortName;
        } else {
            return teamId;
        }
    }

    dataFactory.getTeamDivision = function (teamId) {
        if (dataFactory.teamNames[teamId]) {
            return dataFactory.teamNames[teamId].divisionName;
        } else {
            return "";
        }
    }

    /*
        getFranchise gets all teams associated with the same franchise
        as the current team
    */

    dataFactory.getFranchise = function (callingScope, teamId) {
        // type=Franchise&teamId=200
        request = "Franchise&teamId=" + teamId;
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.franchise = response.data;
            }, function errorCallback(response) {
                dataFactory.reportError("getFranchise", response);
            });
    }

    //========================== GAME INFO ===============================
    /*
        This interface is just for getting specific details about a particular
        game. Game schedules and associated information is handled within the
        scheduleFactory.
    */


    // This version gets the info with a single game, referenced by Id - TODO - Unnecessary?
    dataFactory.getGameInfo = function (callingScope, gameId) {
        // type=Game&gameId=1000
        request = "Game&gameId=" + gameId;
        dataFactory.startDataLoad(callingScope, "getGameInfo");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.gameInfo = response.data[0]; // single object
                dataFactory.finishDataLoad(callingScope, "getGameInfo");
            }, function errorCallback(response) {
                dataFactory.reportError("getGameInfo", response);
                dataFactory.failDataLoad(callingScope, "getGameInfo");
            });
    }

    //========================== TEST ===============================
    /*
        Test database operations
    */

    dataFactory.getTest = function (callingScope) {
        dataFactory.requestHttp("Test")
            .then(function successCallback(response) {
                callingScope.test = response.data;
            }, function errorCallback(response) {
                dataFactory.reportError("getTest", response);
            });
    }

    return dataFactory;

    //-------------------------------------------------------
    // Internal Functions to process returned data

    // {"teamId":"609","teamName":"Bombers","divisionId":"80","divisionName":"Olympic"}
    function addTeamNames(teamList) {
        for (team in teamList) {
            var teamInfo = teamList[team];
            if (!dataFactory.teamNames[teamInfo.teamId]) {
                dataFactory.teamNames[teamInfo.teamId] = teamInfo;
            }
        }
    }

    function extractNotesList(notes) {
        var outNotes = [];
        if (notes) {
            // returning now with new lines, so first convert to $$
            notes = notes.replace(/\n/g, "$-$");
            var rawList = notes.split("$-$");
            for (var line = 0; line < rawList.length; line++) {
                var note = rawList[line];
                if (note.charAt(0) == "-") note = note.substring(1);
                note = note.trim();
                if (note.length > 0) outNotes.push(note);
            }
        }
        return outNotes;
    }

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

    // In order to get roster counts, the query returns up to two lines per team, one for active
    // and one for inactive. These need to be combined into a single item with active and
    // inactive fields. There is no guarantee that a team will have both kinds of records.

    function mergeDivisionData(divisionData) {
        // Iterate over the list, creating only one entry per team
        var records = {};
        for (var i = 0; i < divisionData.length; i++) {
            var record = divisionData[i];
            var teamId = record.teamId;
            if (!records[teamId]) {
                record.active = 0;
                record.total = 0;
                records[teamId] = record;
            }
            records[teamId].total = Number(records[teamId].total) + Number(record.count);
            if (record.status == "active") {
                records[record.teamId].active = record.count;
                records[record.teamId].paid = Number(record.paid);
            }
        }
        // Now build the merged list
        var returnList = [];
        for (var item in records) {
            returnList.push(records[item]);
        }
        returnList.sort(function (a, b) { return (b.teamName > a.teamName) ? -1 : 1; });
        return returnList;
    }
});