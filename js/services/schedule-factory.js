app.factory('scheduleFactory', function (dataFactory, authFactory) {

    // This provider handles the loading and manipulation of game schedules, which are displayed on multiple pages
    // and tabs within the application. It uses dataFactory to do the actual database loads, but some data is essentially
    // cached since getting cross references directly from SQL queries can be cumbersome.
    // Promises and asynchronous calls are handled in the factory objects rather than the controllers to keep those as simple
    // as possible.

    var scheduleFactory = {};
    scheduleFactory.scheduleType = null;
    scheduleFactory.currentYear = null;
    scheduleFactory.activeYear = null;
    scheduleFactory.shortFieldNames = null;
    scheduleFactory.teamNames = {};
    scheduleFactory.games = null;           // TODO: does this need to be saved?
    scheduleFactory.schedule = {};

    // Some relatively static data will be loaded only once at startup
    scheduleFactory.init = function () {
        //loadCurrentYear();
        //scheduleFactory.getYears(;
        scheduleFactory.getCurrentYear(this);
        dataFactory.getShortFieldNames(scheduleFactory);
    }

    //========================== YEARS ===============================

    scheduleFactory.getCurrentYear = function (callingScope) {
        // type=CurrentYear
        // FETCH ONCE
        if (callingScope.currentYear) {
            Utilities.log("!scheduleCache >> currentYear already set");
        } else if (scheduleFactory.currentYear) {
            Utilities.log("!scheduleCache >> currentYear set from cache");
            callingScope.currentYear = scheduleFactory.currentYear;
        } else {
            dataFactory.requestHttp("CurrentYear")
            .then(function successCallback(response) {
                callingScope.currentYear = response.data;
                scheduleFactory.currentYear = response.data;
            }, function errorCallback(response) {
                dataFactory.reportError("getCurrentYear", response);
            });
        }
    }

    scheduleFactory.getYears = function (callingScope, divisionName) {
        // type=Years&division=Adams
        request = "Years";
        if (divisionName !== undefined) request += "&division=" + divisionName;
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.pastYears = response.data;
            // Accomodate other formats
            callingScope.years = response.data;
        }, function errorCallback(response) {
            // TODO: Add better error handling
            dataFactory.reportError("getYears", response);
        });
    }

    scheduleFactory.getYearInfo = function (callingScope) {
        // type=YearInfo    -- mapping of years to competition IDs .. may not be needed.
        // FETCH ONCE
        if (callingScope.yearInfo) {
           Utilities.log("!scheduleCache >> yearInfo already set");
        } else if (scheduleFactory.yearInfo) {
           Utilities.log("!scheduleCache >> yearInfo set from cache");
           callingScope.yearInfo = scheduleFactory.yearInfo;
        } else {
            dataFactory.requestHttp("YearInfo")
            .then(function successCallback(response) {
                callingScope.yearInfo = result[0];  // single object returned
                scheduleFactory.yearInfo = result[0];
            }, function errorCallback(response) {
                dataFactory.reportError("getYearInfo", response);
            });
        }
    };


    //========================== GAMES ===============================
    /*
        getGames services multiple types of queries with a variable set of paramters. Therefore,
        the calling argument is an object with a variable number of named paramters. The PHP query is
        constructed with only the parameters included in the calling argument.
    */

    scheduleFactory.getGames = function (callingScope, params) {
        if (params.perPage !== undefined && params.perPage < 0) {
            params.perPage = 2000; // absolute limit
        }
        request = "Games";
        if (params.year !== undefined) request += "&year=" + params.year;
        if (params.division !== undefined) request += "&division=" + params.division;
        if (params.teamId !== undefined) request += "&teamId=" + params.teamId;
        if (params.playerId !== undefined) request += "&playerId=" + params.playerId;
        if (params.page !== undefined) request += "&page=" + params.page;
        if (params.perPage !== undefined) request += "&perPage=" + params.perPage;
        if (params.fieldId !== undefined) request += "&fieldId=" + params.fieldId;
        if (params.restrict !== undefined) request += "&restrict=" + params.restrict;
        dataFactory.startDataLoad(callingScope, "getGames");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            var games = response.data;
            processGames(games, params);
            if (params.fieldId) {
                if (params.restrict == "Recent") {
                    callingScope.recentGames = games;
                } else {
                    callingScope.upcomingGames = games;
                }
            } else {
                callingScope.games = games;
            }
            dataFactory.finishDataLoad(callingScope, "getGames");
        }, function errorCallback(response) {
            dataFactory.reportError("getGames", response);
            dataFactory.failDataLoad(callingScope, "getGames");
        });
    }

    scheduleFactory.getGameCount = function (callingScope, params) {
        request = "GameCount";
        if (params.year !== undefined) request += "&year=" + params.year;
        if (params.division !== undefined) request += "&division=" + params.division;
        if (params.teamId !== undefined) request += "&team=" + params.teamId;
        if (params.playerId !== undefined) request += "&player=" + params.playerId;
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.gameCount = response.data;
        }, function errorCallback(response) {
            dataFactory.reportError("getGameCount", response);
        });
    }

    scheduleFactory.getGameInfo = function (callingScope, gameId) {
        request = "GameInfo&gameId=" + gameId;
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.gameInfo = response.data;
        }, function errorCallback(response) {
            dataFactory.reportError("getGameInfo", response);
        });
    }

    scheduleFactory.getStandings = function (callingScope, year, divisionName, includePlayoffs) {
        request = "Games&year=" + year + "&division=" + divisionName;
        dataFactory.startDataLoad(callingScope, "getStandings");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.standings = computeStandings(response.data, divisionName, includePlayoffs);
            dataFactory.finishDataLoad(callingScope, "getStandings");
        }, function errorCallback(response) {
            dataFactory.reportError("getStandings", response);
            dataFactory.failDataLoad(callingScope, "getStandings");
        });
    }

    scheduleFactory.getGameSlots = function (callingScope, year) {
        request = "GameSlots&year=" + year;
        dataFactory.startDataLoad(callingScope, "getGameSlots");
        callingScope.gameSlotsLoading = true;
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.gameSlotsLoading = false;
            callingScope.gameSlots = response.data;
            dataFactory.finishDataLoad(callingScope, "getGameSlots");
        }, function errorCallback(response) {
            callingScope.gameSlotsLoading = false;
            dataFactory.reportError("getGameSlots", response);
            dataFactory.failDataLoad(callingScope, "getGameSlots");
        });
    }

    // This is a more specialized function that will return only game slots for
    // future (playoff) games that are currently unscheduled.

    scheduleFactory.getAvailableSlots = function (callingScope) {
        request = "AvailableSlots";
        dataFactory.startDataLoad(callingScope, "getAvailableSlots");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.gameSlots = response.data;
            dataFactory.finishDataLoad(callingScope, "getAvailableSlots");
        }, function errorCallback(response) {
            var error = response.statusText;
            callingScope.result = { "result": "failure", "error": error };
            dataFactory.reportError("getAvailableSlots", response);
            dataFactory.failDataLoad(callingScope, "getAvailableSlots");
        });
    }

    // This is special case function to retrieve a division schedule that includes references
    // to taxi pool requests. It supports a commissioner-only tab on the division page

    scheduleFactory.getTaxiGames = function (callingScope, divisionYear, divisionName) {
        request = "TaxiGames&year=" + divisionYear + "&division=" + divisionName;
        dataFactory.startDataLoad(callingScope, "getTaxiGames");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                var games = response.data;
                var params = {};
                params.scheduleType = "Division";
                processGames(games, params);
                callingScope.taxiGames = games;
                dataFactory.finishDataLoad(callingScope, "getTaxiGames");
            }, function errorCallback(response) {
                var error = response.statusText;
                callingScope.result = { "result": "failure", "error": error };
                dataFactory.reportError("getTaxiGames", response);
                dataFactory.failDataLoad(callingScope, "getTaxiGames");
            });
    }

    //========================== BLACKOUTS ===============================
    // Get Blackout dates for a given year 

    scheduleFactory.getBlackouts = function (callingScope, year) {
        request = "Blackout&year=" + year;
        dataFactory.startDataLoad(callingScope, "getBlackouts");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.blackoutDates = response.data;
                dataFactory.finishDataLoad(callingScope, "getBlackouts");
            }, function errorCallback(response) {
                dataFactory.reportError("getBlackouts", response);
                dataFactory.failDataLoad(callingScope, "getBlackouts");
            });
    }

    scheduleFactory.addBlackoutDate = function (callingScope, addDate) {
        request = "AddBlackout";
        dataFactory.startDataLoad(callingScope, "AddBlackout");
        authFactory.requestHttpPost(request, addDate)
            .then(function successCallback(response) {
                callingScope.addResult = response.data[0];
                dataFactory.finishDataLoad(callingScope, "addBlackoutDate");
            }, function errorCallback(response) {
                dataFactory.reportError("addBlackoutDate", response);
                dataFactory.failDataLoad(callingScope, "addBlackoutDate");
            });
    }

    //========================== AVAILABLE FIELDS EDITING ===============================
    // 

    scheduleFactory.addField = function (callingScope, addSlot) {
        request = "AddFieldSlot";
        authFactory.startDataLoad(callingScope, "addField");
        authFactory.requestHttpPost(request, addSlot)
            .then(function successCallback(response) {
                callingScope.addResult = response.data[0];
                dataFactory.finishDataLoad(callingScope, "addField");
            }, function errorCallback(response) {
                callingScope.addResult = { "result": "failure", "error": "Server Error: " + response.statusText };
                dataFactory.reportError("addField", response);
                dataFactory.failDataLoad(callingScope, "addField");
            });
    }

    scheduleFactory.editField = function (callingScope, editSlot) {
        request = "EditFieldSlot";
        authFactory.startDataLoad(callingScope, "editField");
        authFactory.requestHttpPost(request, editSlot)
            .then(function successCallback(response) {
                callingScope.editResult = response.data[0];
                dataFactory.finishDataLoad(callingScope, "editField");
            }, function errorCallback(response) {
                callingScope.editResult = { "result": "failure", "error": "Server Error: " + response.statusText };
                dataFactory.reportError("editField", response);
                dataFactory.failDataLoad(callingScope, "editField");
            });
    }

    scheduleFactory.deleteField = function (callingScope, slotId) {
        request = "DeleteFieldSlot&slotId=" + slotId;
        authFactory.startDataLoad(callingScope, "deleteField");
        authFactory.requestHttp(request)
            .then(function successCallback(response) {
                callingScope.deleteResult = response.data[0];
                dataFactory.finishDataLoad(callingScope, "deleteField");
            }, function errorCallback(response) {
                callingScope.deleteResult = { "result": "failure", "error": "Server Error: " + response.statusText };
                dataFactory.reportError("deleteField", response);
                dataFactory.failDataLoad(callingScope, "deleteField");
            });
    }


    //========================== SCHEDULE DOWNLOADS ===============================
    // Handle all schedule downloads
    scheduleFactory.schedule.download = function (games, fileType) {
        DownloadSchedule(games, fileType);
    }

    return scheduleFactory;

    //-------------------------------------------------------
    // Internal Functions to preload frequently accessed data

    // {"homeId":"637","awayId":"638","homeRuns":"11","awayRuns":"3","homeName":"Mariners","awayName":"Silver Foxes","homeDivision":"Everest","awayDivision":"Everest","homeShort":"Mar","awayShort":"Sil","dateTime":"2015-05-02 16:00:00","fieldId":"46","fieldName":"Newport H.S.","outcome":"finished","gameId":"6287","playoffRound":"0","result":"home_win"}
    function computeStandings(games, divisionName, includePlayoffs) {

        // start by saving the raw returned results, if provided
        if (!games) return;

        standings = {};

        // Loop through each game and fill in missing information
        for (var i = 0; i < games.length; i++) {

            // Only use finished, non-playoff games, unless includePlayoffs = true;
            if ((games[i].outcome == "finished" || games[i].outcome == "forfeited") && (includePlayoffs || games[i].playoffRound == "0")) {
                var home = games[i].homeId;
                var away = games[i].awayId;
                if (!standings[home]) standings[home] = { wins: 0, losses: 0, ties: 0, sequence: "" };
                if (!standings[away]) standings[away] = { wins: 0, losses: 0, ties: 0, sequence: "" };
                standings[home].rf = increment(standings[home].rf, games[i].homeRuns);
                standings[away].rf = increment(standings[away].rf, games[i].awayRuns);
                standings[home].ra = increment(standings[home].ra, games[i].awayRuns);
                standings[away].ra = increment(standings[away].ra, games[i].homeRuns);
                if (Number(games[i].homeRuns) > Number(games[i].awayRuns)) {
                    standings[home].wins = increment(standings[home].wins, 1);
                    standings[home].sequence += "W";
                    standings[home].lastGameId = games[i].gameId;
                    standings[home].lastGameResult = shortDate(games[i]) + " W vs. " + games[i].awayName + " " + games[i].homeRuns + "-" + games[i].awayRuns;
                    standings[away].losses = increment(standings[away].losses, 1);
                    standings[away].sequence += "L";
                    standings[away].lastGameId = games[i].gameId;
                    standings[away].lastGameResult = shortDate(games[i]) + " L @ " + games[i].homeName + " " + games[i].homeRuns + "-" + games[i].awayRuns;
                } else if (Number(games[i].homeRuns) < Number(games[i].awayRuns)) {
                    standings[away].wins = increment(standings[away].wins, 1);
                    standings[away].sequence += "W";
                    standings[away].lastGameId = games[i].gameId;
                    standings[away].lastGameResult = shortDate(games[i]) + " W @ " + games[i].homeName + " " + games[i].awayRuns + "-" + games[i].homeRuns;
                    standings[home].losses = increment(standings[home].losses, 1);
                    standings[home].sequence += "L";
                    standings[home].lastGameId = games[i].gameId;
                    standings[home].lastGameResult = shortDate(games[i]) + " L vs. " + games[i].awayName + " " + games[i].awayRuns + "-" + games[i].homeRuns;
                } else {
                    standings[home].ties = increment(standings[home].ties, 1);
                    standings[home].sequence += "T";
                    standings[home].lastGameId = games[i].gameId;
                    standings[home].lastGameResult = shortDate(games[i]) + " T vs. " + games[i].awayName + " " + games[i].homeRuns + "-" + games[i].awayRuns;
                    standings[away].ties = increment(standings[away].ties, 1);
                    standings[away].sequence += "T";
                    standings[away].lastGameId = games[i].gameId;
                    standings[away].lastGameResult = shortDate(games[i]) + " T @ " + games[i].homeName + " " + games[i].homeRuns + "-" + games[i].awayRuns;
                }
            }
        }

        // Now post-process each line in the standings object
        var maxGamesAhead = 0;
        for (record in standings) {
            var teamId = record;
            var teamDivision = dataFactory.getTeamDivision(teamId);
            // Because of interdivisional games, some teams may be from other divisions; ignore those
            if (teamDivision == divisionName) {
                var currentRecord = standings[record];
                currentRecord.teamDivision = teamDivision;
                currentRecord.teamName = dataFactory.getTeamName(teamId);
                currentRecord.games = Number(currentRecord.wins) + Number(currentRecord.losses) + Number(currentRecord.ties);
                currentRecord.pct = (2 * currentRecord.wins + currentRecord.ties) / (2 * currentRecord.games);
                currentRecord.diff = (currentRecord.rf - currentRecord.ra) / currentRecord.games;
                currentRecord.gamesAhead = Number(currentRecord.wins) - Number(currentRecord.losses);
                if (currentRecord.gamesAhead > maxGamesAhead) maxGamesAhead = currentRecord.gamesAhead;
            }
        }

        // ... and reassemble in order
        var orderedStandings = [];
        for (record in standings) {
            var teamId = record;
            var teamDivision = dataFactory.getTeamDivision(teamId);
            // Because of interdivisional games, some teams may be from other divisions; ignore those
            if (teamDivision == divisionName) {
                var currentRecord = standings[record];
                currentRecord.teamId = teamId;
                currentRecord.GB = (maxGamesAhead - currentRecord.gamesAhead) / 2;
                // Now handle 0 GB in html
                //if (currentRecord.GB == 0) currentRecord.GB = "-";
                orderedStandings.push(currentRecord);
            }
        }
        orderedStandings.sort(function (a, b) {
            return 10000 * (b.pct - a.pct) + (a.GB - b.GB);
        })
        return orderedStandings;
    }

    function loadCurrentYear() {

        // Only needs to be called once.
        if (scheduleFactory.currentYear) return;

       Utilities.log("Calling getCurrentYear");
        dataFactory.getCurrentYear()
            .success(function (currentYear) {
                scheduleFactory.currentYear = currentYear;
               Utilities.log("... getCurrentYear Succeeded: returned " + currentYear);

                // Once currentYear is established, we can proceed to load team info
                scheduleFactory.activeYear = currentYear;
                loadTeamInfo(currentYear);
            })
            .error(function (error) {
               Utilities.log("... getCurrentYear Failed");
            });
    }


    function loadYears() {

        // Only needs to be called once.
        if (scheduleFactory.years) return;

       Utilities.log("Calling getYears");
        dataFactory.getYears()
            .success(function (years) {
               Utilities.log("... getYears Succeeded");

                // Once currentYear is established, we can proceed to load team info
                scheduleFactory.years = years;
            })
            .error(function (error) {
               Utilities.log("... getYears Failed");
            });
    }

    function loadTeamInfo(year) {

        // Only needs to be called once.
        if (scheduleFactory.teamNames && scheduleFactory.teamNames[year]) return;

        // Team info varies by year. We load the data for a particular year when needed.

       Utilities.log("Calling getTeamInfo");
        dataFactory.requestHttp("TeamNames")
            .success(function (teams) {
                scheduleFactory.teamNames[year] = {};
                scheduleFactory.teamDivisions[year] = {};
                var teamNames = {};
                var teamDivisions = {};
                for (var i = 0; i < teams.length; i++) {
                    teamNames["T" + teams[i].teamId] = teams[i].teamName;
                    teamDivisions["T" + teams[i].teamId] = teams[i].divisionName;
                }
                scheduleFactory.teamNames[year] = teamNames;
                scheduleFactory.teamDivisions[year] = teamDivisions;
               Utilities.log("... loadTeamInfo Succeeded:");
            })
            .error(function (error) {
               Utilities.log("... loadTeamInfo Failed");
            });

    }

    // {"homeId":"635","awayId":"636","homeRuns":"10","awayRuns":"15","homeName":"Bears","awayName":"Lumber Kings","homeDivision":"Everest","awayDivision":"Everest",
    function processGames(games, params) {

        // Loop through each game and fill in missing information
        for (var i = 0; i < games.length; i++) {

            // Query now returns team names, divisions, and short names, so no more look up.
            // Only need to format in accordance with schedule type.
            games[i].homeTeam = games[i].homeName;
            games[i].awayTeam = games[i].awayName;
            if (params.scheduleType == "homePage") {
                games[i].awayTeam = games[i].awayDivision + " " + games[i].awayName;
                if (games[i].awayDivision != games[i].homeDivision) {
                    games[i].homeTeam = games[i].homeDivision + " " + games[i].homeName;
                }
            } else if (params.scheduleType == "league") {
                games[i].homeTeam = games[i].homeDivision + " " + games[i].homeName;
                if (games[i].awayDivision != games[i].homeDivision) {
                    games[i].awayTeam = games[i].awayDivision + " " + games[i].awayName;
                }
            } else if (params.scheduleType == "division") {
                if (games[i].homeDivision != params.division) {
                    games[i].homeTeam = games[i].homeDivision + " " + games[i].homeName;
                }
                if (games[i].awayDivision != params.division) {
                    games[i].awayTeam = games[i].awayDivision + " " + games[i].awayName;
                }
            } else if (params.scheduleType == "player") {
                // Mixed schedule, so indicate home division
                games[i].homeTeam = games[i].homeDivision + " " + games[i].homeName;
            } else if (params.scheduleType == "team") {
                if (games[i].homeId == params.teamId) {
                    games[i].opponent = "vs. " + games[i].awayName;
                    games[i].opponentId = games[i].awayId;
                    games[i].opponentName = games[i].awayName;
                    games[i].opponentDivision = games[i].awayDivision;
                } else {
                    games[i].opponent = "@ " + games[i].homeName;
                    games[i].opponentId = games[i].homeId;
                    games[i].opponentName = games[i].homeName;
                    games[i].opponentDivision = games[i].homeDivision;
                }
            }

            // Set the date and time parameters
            games[i].date = new Date(games[i].dateTime);
            games[i].time = new Date(games[i].dateTime);

            // No longer need to get short field name - returned by Query
            //games[i].fieldName = getFieldName(games[i].fieldId);

            games[i].result = formatResult(params, games[i]);
        }
    }

    function getFieldName(fieldId) {
        if (!fieldId || !scheduleFactory.shortFieldNames) return "?????";
        var fieldName = scheduleFactory.shortFieldNames["F" + fieldId];
        return fieldName ? fieldName : "??????";
    }

    function formatResult(params, game) {
        // First thing to check is for future game
        var gameTime = new Date(game.dateTime);
        var currentTime = new Date();
        var diff = currentTime - gameTime;
        if (diff < 3000 * 3600) {    // Up until three hours after game start
            game.outcome = "";
            return "scheduled";
        }
        if (!game.homeRuns || !game.awayRuns) {
            return game.awayName + " ?  @ " + game.homeName + " ?";
        }

        var forfeit = (game.outcome == "forfeited") ? " (forfeit)" : "";
        if (params.scheduleType == "team") {
            // Change to W/L
            var runsFor = Number(game.awayRuns);
            var runsAgainst = Number(game.homeRuns);
            if (params.teamId == game.homeId) {
                var runsFor = Number(game.homeRuns);
                var runsAgainst = Number(game.awayRuns);
            }
            if (runsFor == runsAgainst) { game.outcome = "T"; return runsFor + "-" + runsAgainst + forfeit; }
            if (runsFor > runsAgainst) { game.outcome = "W"; return runsFor + "-" + runsAgainst + forfeit; }
            game.outcome = "L";
            return runsAgainst + "-" + runsFor + forfeit;
        }
        if (Number(game.awayRuns) > Number(game.homeRuns)) {
            return game.awayName + " " + game.awayRuns + " - " + game.homeName + " " + game.homeRuns + forfeit;
        } else {
            return game.homeName + " " + game.homeRuns + " - " + game.awayName + " " + game.awayRuns + forfeit;
        }
    }

    function shortDate(game) {
        var gameDate = new Date(game.dateTime);
        return (gameDate.getMonth() + 1) + "/" + gameDate.getDate();
    }

    function increment(initValue, addValue) {
        var sum = Number(initValue);
        if (!sum) sum = 0;
        sum += Number(addValue);
        return sum;
    }

    function DownloadSchedule(games, fileType) {
        var text = "";
        if (fileType == "ics") {
            text += "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PCBL//NONSGML Schedule Data//EN\n";
        }
        for (var i = 0; i < games.length; i++) {
            var game = games[i];
            if (fileType == "csv") {
                if (i > 0) text += "\n";
                var dateString = game.dateTime.toString();
                var formattedDate = '"' + dateString.substr(0, 6) + ',' + dateString.substr(6, 5) + '",' + dateString.substr(13);
                text += game.homeName + "," + game.awayName + "," + formattedDate + "," + game.fieldName + "," + game.result;
            } else if (fileType == "ics") {
                text += "BEGIN:VEVENT\nVERSION:2.0\n";
text += "UID:g" + game.gameId + "@pcbl.org\n";
            //text += "ORGANIZER:CN=PCBL Staff:MAILTO:info@pcbl.org\n";
                text += "DTSTART:" + ConvertDateToCalendar(game.dateTime) + "\n";
                var endTime = new Date(game.dateTime);
                endTime.setMinutes(endTime.getMinutes() + 180); // start + 3 hours
                text += "DTEND:" + ConvertDateToCalendar(endTime.toString()) + "\n";
                text += "SUMMARY:" + game.awayName + " @ " + game.homeName + "\n";
                text += "LOCATION:" + game.fieldName + "\n";
                text += "END:VEVENT\n";
            } else {
                return; // Unknown file type
            }
        }
        if (fileType == "ics") {
            text += "END:VCALENDAR";
        }
        dataFactory.downloadAsFile(text, "Schedule." + fileType);
    }

    function ConvertDateToCalendar(dateTimeString) {
        var dateTime = new Date(dateTimeString);
        // Need to convert to UTC or else define time zone in ics file. Do the former;
        // -- seems to mess up Outlook.
        dateTime.setMinutes(dateTime.getMinutes() + 7 * 60);  // PDT = GMT - 7 hours
        var pre = dateTime.getFullYear().toString() + ((dateTime.getMonth() + 1) < 10 ? "0" + (dateTime.getMonth() + 1).toString() : (dateTime.getMonth() + 1).toString());
        pre += ((dateTime.getDate() + 1) < 10 ? "0" + dateTime.getDate().toString() : dateTime.getDate().toString());
        var post = (dateTime.getHours() < 10) ? "0" + dateTime.getHours().toString() : dateTime.getHours().toString();
        post += (dateTime.getMinutes() < 10) ? "0" + dateTime.getMinutes().toString() : dateTime.getMinutes().toString();
        post += "00Z";
        return (pre + "T" + post);
    }
});

