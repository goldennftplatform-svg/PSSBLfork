app.controller('testController', function ($scope, $location, $http, dataFactory, scheduleFactory, authFactory) {

    Utilities.log("Loading testController...");
    $scope.controllerName = "testController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    $scope.testSelected = "DraftPhotos";

    if (!authFactory.hasPermission("competition", authFactory.login.userId, "Administrator")) {
        $location.path("/message/not-authorized");
    }

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    // Link to season-dependent constants
    $scope.season = dataFactory.season;
    season = dataFactory.season;

    $scope.testResult = "(none)"
    $scope.shortFieldNames = null;
    $scope.teamNames = null;

    $scope.pastYears = undefined;
    $scope.testResults = {};

    $scope.selectTest = function (testTag) {
        $scope.testSelected = testTag;
    }

    // ------------ Date format testing   ------------
    $scope.dateStrings = [
        { raw: "2015-05-11 19:00:00", parsed: "" },
        { raw: "12/15/83", parsed: "" },
        { raw: "12/15/1983 20:00:00", parsed: "" }
    ];

    for (var i = 0; i < $scope.dateStrings.length; i++) {
        $scope.dateStrings[i].parsed = Date.parse($scope.dateStrings[i].raw);
    }

    // Bootstrap datepicker code
    $scope.today = function () {
        $scope.dt = new Date();
    };
    $scope.today();

    $scope.clear = function () {
        $scope.dt = null;
    };

    $scope.inlineOptions = {
        customClass: getDayClass,
        minDate: new Date(),
        showWeeks: true
    };

    $scope.dateOptions = {
        dateDisabled: disabled,
        formatYear: 'yy',
        maxDate: new Date(2020, 5, 22),
        minDate: new Date(),
        startingDay: 1
    };

    // Disable weekend selection
    function disabled(data) {
        var date = data.date,
            mode = data.mode;
        return mode === 'day' && (date.getDay() === 0 || date.getDay() === 6);
    }

    $scope.toggleMin = function () {
        $scope.inlineOptions.minDate = $scope.inlineOptions.minDate ? null : new Date();
        $scope.dateOptions.minDate = $scope.inlineOptions.minDate;
    };

    $scope.toggleMin();

    $scope.open1 = function () {
        $scope.popup1.opened = true;
    };

    $scope.open2 = function () {
        $scope.popup2.opened = true;
    };

    $scope.setDate = function (year, month, day) {
        $scope.dt = new Date(year, month, day);
    };

    $scope.formats = ['M/dd/yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
    $scope.format = $scope.formats[0];
    $scope.altInputFormats = ['M!/d!/yyyy'];

    $scope.popup1 = {
        opened: false
    };

    $scope.popup2 = {
        opened: false
    };

    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var afterTomorrow = new Date();
    afterTomorrow.setDate(tomorrow.getDate() + 1);
    $scope.events = [
        {
            date: tomorrow,
            status: 'full'
        },
        {
            date: afterTomorrow,
            status: 'partially'
        }
    ];

    function getDayClass(data) {
        var date = data.date,
            mode = data.mode;
        if (mode === 'day') {
            var dayToCheck = new Date(date).setHours(0, 0, 0, 0);

            for (var i = 0; i < $scope.events.length; i++) {
                var currentDay = new Date($scope.events[i].date).setHours(0, 0, 0, 0);

                if (dayToCheck === currentDay) {
                    return $scope.events[i].status;
                }
            }
        }

        return '';
    }


    // ------------ Draft photo recovery   ------------
    if ($scope.testSelected == "OldDraftPhotos") {
        var maxPhoto = 953;
        $scope.photoArray = [];
        for (var i = 0; i < maxPhoto; i++) $scope.photoArray[i] = i + 1;
        $scope.draftPhotoLink = function (index) {
            return "https://5d2beecc3c0943efbdd6-031be4adef08844fc29a90cc1f678af8.ssl.cf2.rackcdn.com/aff/" + index + "/player-pool-images/2.jpg";
        }
    }

    // ------------ Current Draft Photos   ------------
    $scope.photos = {}
    $scope.photos.verified = false;
    $scope.photos.photoArray = [];
    var maxDraftPhoto = 550;
    $scope.photos.photoArray = [];
    for (var i = 0; i < maxDraftPhoto; i++) {
        var entry = {}
        entry.bib = i + 1;
        entry.name = "Unverified";
        $scope.photos.photoArray[i] = entry;
    }
    $scope.photos.draftPhotoLink = function (index) {
        return "https://pssbl.com/data/upload/photos/draft/" + authFactory.login.year + "/" + index + ".jpg";
    }

    $scope.photos.verify = function () {
        dataFactory.getDraftPlayers($scope.photos, authFactory.login.year, 0, -1);
        $scope.photos.verified = true;
    }

    // When the tryout player data returns, reload the data
    $scope.$watch('photos.draftPlayers', function (newValue, oldValue) {
        if (newValue && !oldValue) {
            if ($scope.photos.draftPlayers[0].error) {
                $scope.photos.error = $scope.photos.draftPlayers[0].error;
            } else {
                $scope.photos.photoArray = []
                var index = 0
                for (var player in $scope.photos.draftPlayers) {
                    var entry = {}
                    var playerRow = $scope.photos.draftPlayers[player]
                    entry.bib =  parseInt(playerRow.bib)
                    entry.name = playerRow.firstName + " " + playerRow.lastName
                    entry.draftId = playerRow.draftId
                    if (entry.bib) {
                        $scope.photos.photoArray[index++] = entry
                    }
                }
                $scope.photos.photoArray.sort((a, b) => a.bib - b.bib)
            }
        }
    });

    // ------------ ngEditor testing   ------------

    $scope.editorOptions = {
        language: 'en'
        // uiColor: '#000000'
    };
    $scope.$on("ckeditor.ready", function (event) {
        $scope.isReady = true;
    });
    $scope.test = '<p>Hello</p>\n';
    $scope.save = function () {
        $http.post('/examples/test.php', {
            content: $scope.test
        }).success(function () {
            alert('Saved');
        });
    }
    $scope.save = function () {
        console.info($scope.test, 'save');
    }


    // ------------ Http testing   ------------

    $scope.currentYear = null;
    $scope.fieldCount = null;
    $scope.fields = null;

    $scope.testHttp = function () {
        Utilities.log("Running testHttp Test ...");
        RunAllTests($scope.testResults);
    }

    $scope.httpTests = {};
    $scope.httpTests.data = JSON.stringify({ "name": "Joe", "result": "success" });
    $scope.httpTests.testUploadHttp = function () {
        $scope.httpTests.uploadHttp($scope.httpTests.data, "test-upload");
    }



    $scope.httpTests.uploadHttp = function (data, fileBase) {

        var fileName = '/data/articles/' + fileBase + ".html";
        $http.post(fileName, data, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        }).then(function successCallback(response) {
                var x = response.data;
                Utilities.log("Uploaded article of size =" + response.data.length);
            }, function errorCallback(response) {
                dataFactory.reportError("uploadHttp", response.message);
            });
    }

    $scope.onFileSelect = function ($files) {
        Upload.upload({
            url: 'data/uploads/',
            file: $files,
        }).progress(function (e) {
        }).then(function (data, status, headers, config) {
            // file is uploaded successfully
            console.log(data);
        });
    }

    // ----------- End of Http test region ----------

    // ------------ Scorebook capture tool   ------------

    $scope.boxScore = {};
    $scope.boxScore.loadHttp = function (loadObject, url) {

        $http.get(url)
        .then(function successCallback(response) {
            loadObject.html = response.data;
            Utilities.log("Fetched article of size =" + response.data.length);
        }, function errorCallback(response) {
            dataFactory.reportError("loadHttp", response.statusText);
            loadObject.html = "";
        });
    }

    $scope.boxScore.collect = function () {
        var callingScope = {};
        var url = "https://pssbl.com/game/14886/summer/2016/2016-08-26-rainier-beach-high-school--adirondack-mavericks-vs-adirondack-solar-sox";
        $scope.boxScore.loadHttp(callingScope, url);
        var x = 0;
    }


    // ----------- End of Scorebook capture tool ----------

    // ------------ login menu testing   ------------

    $scope.loggedIn = false;

    $scope.login = function () {
        $scope.myTeams = [
            { ref: "#", name: "Adirondack Generals" },
            { ref: "#", name: "Teton Rivercats" },
            { ref: "#", name: "Everest Mustangs" }
        ];
        $scope.isAdmin = true;
        $scope.loggedIn = true;
    }

    $scope.logout = function () {
        $scope.loggedIn = false;
    }

    // ------------ session storage testing   ------------
    $scope.storageTests = {};

    $scope.storageTests.clickCounter = function() {
        if (typeof (Storage) !== "undefined") {
            if (sessionStorage.clickcount) {
                sessionStorage.clickcount = Number(sessionStorage.clickcount) + 1;
            } else {
                sessionStorage.clickcount = 1;
            }
            $scope.storageTests.result = "You have clicked the button " + sessionStorage.clickcount + " time(s).";
        } else {
            $scope.storageTests.result = "Sorry, your browser does not support web storage...";
        }
    }
    // ------------ End of session storage testing   ------------

    // ------------ permissions testing   ------------
    $scope.permissionTests = {};

    $scope.permissionTests.isLoggedIn = function () {
        return authFactory.login.loggedIn;
    }

    $scope.permissionTests.isAdmin = function () {
        return authFactory.login.isAdmin;
    }

    $scope.permissionTests.userId = function () {
        return authFactory.login.userId;
    }

    $scope.permissionTests.getServerPerms = function () {
        authFactory.testPermissions($scope.permissionTests);
    }

    $scope.permissionTests.getServerInfo = function () {
        authFactory.testServer($scope.permissionTests);
    }

    $scope.permissionTests.getSessionInfo = function () {
        authFactory.testSession($scope.permissionTests);
    }

    // ------------ End of permissions testing   ------------

    // ------------ Draft Tools  ------------

    $scope.draftTools = {};
    $scope.draftTools.createFile = function () {
        dataFactory.getAllTeams($scope.draftTools, season.currentYear)
        .then(BuildDraftObject);
    }

    // When the getAllTeams call returns, we build the draft object
    $scope.$watch('draftTools.teams', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            BuildDraftObject();
        }
    });

    function BuildDraftObject() {
        var teams = $scope.draftTools.teams;
        var divisionName = "";
        var draft = [];
        var division = {};
        for (var i = 0; i < teams.length; i++) {
            var team = teams[i];
            team.name = team.teamName;
            team.id = team.teamId;
            team.status = "active";
            if (team.division != division.name) {
                division = {};
                division.name = team.division;
                division.id = team.divisionId;
                division.teams = [];
                draft.push(division);
            }
            delete team.division;
            delete team.divisionId;
            delete team.teamName;
            delete team.teamId;
            division.teams.push(team);
        }
        var jsonString = angular.toJson(draft);
    }

    // ------------ End of Draft Tools   ------------

    // ------------ Modal Dialog Testing   ------------

    $scope.modalTests = {};
    $scope.modalTests.showModalOne = function () {
        alert("Does this work?");
    };

    /*
    var ModalOne = $modal({ title: 'Modal One', content: 'Arbitrary Message Text Displayed Here', show: false });
    $scope.modalTests.showModalOne = function () {
        ModalOne.$promise.then(ModalOne.show);
    };

    $scope.modlTests.hideModalOne = function () {
        ModalOne.$promise.then(ModalOne.hide);
    };
    */

    // ------------ End of permissions testing   ------------

    $scope.scheduleTest = function () {
        Utilities.log("Running Schedule Test ...");
        params = {};
        params.year = 2015;
        params.division = "Adirondack";
        params.scheduleType = "Division";
        scheduleFactory.getGames(params);
    }

    // ------------ End of schedule testing   ------------

    // ------------ Deactivation Tool  ------------

    $scope.deactivationTests = {};
    $scope.deactivationTests.playerList =
    [
        {
            "userId": 2284,
            "teamId": 1122
        },
        {
            "userId": 2284,
            "teamId": 1128
        },
        {
            "userId": 2284,
            "teamId": 1151
        },
        {
            "userId": 458,
            "teamId": 1123
        },
        {
            "userId": 458,
            "teamId": 1127
        },
        {
            "userId": 5934,
            "teamId": 1138
        },
        {
            "userId": 1748,
            "teamId": 1143
        },
        {
            "userId": 1088,
            "teamId": 1147
        },
        {
            "userId": 6312,
            "teamId": 1124
        },
        {
            "userId": 5549,
            "teamId": 1138
        },
        {
            "userId": 489,
            "teamId": 1122
        },
        {
            "userId": 6580,
            "teamId": 1144
        },
        {
            "userId": 6488,
            "teamId": 1143
        },
        {
            "userId": 455,
            "teamId": 1123
        },
        {
            "userId": 6252,
            "teamId": 1107
        },
        {
            "userId": 6491,
            "teamId": 1105
        },
        {
            "userId": 6519,
            "teamId": 1094
        },
        {
            "userId": 4549,
            "teamId": 1095
        },
        {
            "userId": 6424,
            "teamId": 1091
        },
        {
            "userId": 6454,
            "teamId": 1111
        },
        {
            "userId": 5754,
            "teamId": 1094
        },
        {
            "userId": 5831,
            "teamId": 1107
        },
        {
            "userId": 6410,
            "teamId": 1112
        },
        {
            "userId": 5486,
            "teamId": 1141
        },
        {
            "userId": 5431,
            "teamId": 1141
        },
        {
            "userId": 261,
            "teamId": 1120
        },
        {
            "userId": 218,
            "teamId": 1142
        },
        {
            "userId": 935,
            "teamId": 1157
        },
        {
            "userId": 743,
            "teamId": 1120
        },
        {
            "userId": 1054,
            "teamId": 1142
        },
        {
            "userId": 4956,
            "teamId": 1110
        },
        {
            "userId": 3132,
            "teamId": 1121
        },
        {
            "userId": 3191,
            "teamId": 1093
        },
        {
            "userId": 5796,
            "teamId": 1141
        },
        {
            "userId": 6291,
            "teamId": 1138
        },
        {
            "userId": 1082,
            "teamId": 1149
        },
        {
            "userId": 578,
            "teamId": 1120
        },
        {
            "userId": 5085,
            "teamId": 1144
        },
        {
            "userId": 6385,
            "teamId": 1143
        },
        {
            "userId": 6379,
            "teamId": 1143
        },
        {
            "userId": 4213,
            "teamId": 1152
        },
        {
            "userId": 6325,
            "teamId": 1114
        },
        {
            "userId": 852,
            "teamId": 1117
        },
        {
            "userId": 6330,
            "teamId": 1131
        },
        {
            "userId": 4019,
            "teamId": 1126
        },
        {
            "userId": 4340,
            "teamId": 1133
        },
        {
            "userId": 5383,
            "teamId": 1137
        },
        {
            "userId": 6419,
            "teamId": 1131
        },
        {
            "userId": 488,
            "teamId": 1103
        },
        {
            "userId": 4773,
            "teamId": 1100
        },
        {
            "userId": 1137,
            "teamId": 1129
        }
    ];

    $scope.deactivationTests.deactivateAll = function () {
        $scope.deactivationTests.index = 0;
        $scope.deactivationTests.timerId = setInterval($scope.deactivationTests.deactivateNext, 1000);
    }

    $scope.deactivationTests.deactivateNext = function () {
        var index = $scope.deactivationTests.index;
        if (index >= $scope.deactivationTests.playerList.length) {
            clearInterval($scope.deactivationTests.timerId);
        } else {
            var item = $scope.deactivationTests.playerList[index];
            console.log("Deactivating User " + item.userId + " on team " + item.teamId) + "\n";
            // Deactivate and send announcement mail
            authFactory.deactivate($scope.deactivationTests, item.userId, item.teamId, true);
            $scope.deactivationTests.index++;
        }
    }

    $scope.$watch('deactivationTests.deactivateResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.deactivationTests.deactivateResult.error) {
                console.log("-- Error: " + $scope.deactivationTests.deactivateResult.error) + "\n";
            } else {
                console.log("-- Success\n");
            }
        }
    });

    // ------------ End of deactivation Tool   ------------

    // ------------ MergeDups Tool  ------------

    $scope.mergeDupTests = {};
    $scope.mergeDupTests.playerList =
        [
            {
                "dupId": 4059,
                "userId": 573
            },
            {
                "dupId": 5445,
                "userId": 578
            },
            {
                "dupId": 2254,
                "userId": 1708
            },
            {
                "dupId": 2236,
                "userId": 2179
            },
            {
                "dupId": 5749,
                "userId": 2518
            },
            {
                "dupId": 3627,
                "userId": 2684
            },
            {
                "dupId": 2932,
                "userId": 2901
            },
            {
                "dupId": 5507,
                "userId": 3704
            },
            {
                "dupId": 1297,
                "userId": 3718
            },
            {
                "dupId": 3955,
                "userId": 3859
            },
            {
                "dupId": 2731,
                "userId": 4194
            },
            {
                "dupId": 5605,
                "userId": 5307
            },
            {
                "dupId": 3286,
                "userId": 5442
            },
            {
                "dupId": 2817,
                "userId": 5448
            },
            {
                "dupId": 1726,
                "userId": 5454
            },
            {
                "dupId": 2231,
                "userId": 5461
            },
            {
                "dupId": 1235,
                "userId": 5495
            },
            {
                "dupId": 2439,
                "userId": 5501
            },
            {
                "dupId": 5147,
                "userId": 5518
            },
            {
                "dupId": 3179,
                "userId": 5559
            },
            {
                "dupId": 1532,
                "userId": 5561
            },
            {
                "dupId": 814,
                "userId": 5573
            },
            {
                "dupId": 4669,
                "userId": 5580
            },
            {
                "dupId": 3608,
                "userId": 5597
            },
            {
                "dupId": 1800,
                "userId": 5609
            },
            {
                "dupId": 1520,
                "userId": 5618
            },
            {
                "dupId": 188,
                "userId": 5665
            },
            {
                "dupId": 5942,
                "userId": 5679
            },
            {
                "dupId": 2213,
                "userId": 5700
            },
            {
                "dupId": 4223,
                "userId": 5734
            },
            {
                "dupId": 1702,
                "userId": 5743
            },
            {
                "dupId": 3552,
                "userId": 5759
            },
            {
                "dupId": 5128,
                "userId": 5763
            },
            {
                "dupId": 2092,
                "userId": 5767
            },
            {
                "dupId": 340,
                "userId": 5784
            },
            {
                "dupId": 1174,
                "userId": 5785
            },
            {
                "dupId": 5055,
                "userId": 5796
            },
            {
                "dupId": 1005,
                "userId": 5810
            },
            {
                "dupId": 765,
                "userId": 5829
            },
            {
                "dupId": 3939,
                "userId": 5846
            },
            {
                "dupId": 1866,
                "userId": 5862
            },
            {
                "dupId": 486,
                "userId": 5874
            },
            {
                "dupId": 5876,
                "userId": 5877
            },
            {
                "dupId": 3634,
                "userId": 5937
            },
            {
                "dupId": 5679,
                "userId": 5942
            }
        ];

    $scope.mergeDupTests.mergeAll = function () {
        $scope.mergeDupTests.index = 0;
        $scope.mergeDupTests.timerId = setInterval($scope.mergeDupTests.mergeNext, 1000);
    }

    $scope.mergeDupTests.mergeSingle = function () {
        authFactory.mergeDup($scope.mergeDupTests, $scope.mergeDupTests.with, $scope.mergeDupTests.replace);
    }

    $scope.mergeDupTests.mergeNext = function () {
        var index = $scope.mergeDupTests.index;
        if (index >= $scope.mergeDupTests.playerList.length) {
            clearInterval($scope.mergeDupTests.timerId);
        } else {
            var item = $scope.mergeDupTests.playerList[index];
            console.log("Removing User " + item.userId + " duplicate ID: " + item.dupId) + "\n";
            authFactory.mergeDup($scope.mergeDupTests, item.userId, item.dupId);
            $scope.mergeDupTests.index++;
        }
    }

    $scope.$watch('mergeDupTests.mergeResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.mergeDupTests.mergeResult.error) {
                console.log("-- Error: " + $scope.mergeDupTests.mergeResult.error) + "\n";
            } else {
                console.log("Result: " + $scope.mergeDupTests.mergeResult.result + ", message = " + $scope.mergeDupTests.mergeResult.message);
            }
        }
    });

    // ------------ End of merge dups Tool   ------------

    // ------------ Remove From Roster Tool  ------------

    $scope.removeFromRosterTest = {};
    $scope.removeFromRosterTest.playerList =
        [
            {
                "playerId": 461,
                "teamId": 1033
            },
            {
                "playerId": 484,
                "teamId": 1033
            },
            {
                "playerId": 524,
                "teamId": 1033
            },
            {
                "playerId": 647,
                "teamId": 1033
            },
            {
                "playerId": 734,
                "teamId": 1033
            },
            {
                "playerId": 2486,
                "teamId": 1033
            },
            {
                "playerId": 3270,
                "teamId": 1033
            },
            {
                "playerId": 3957,
                "teamId": 1033
            },
            {
                "playerId": 4159,
                "teamId": 1033
            },
            {
                "playerId": 4773,
                "teamId": 1033
            },
            {
                "playerId": 5249,
                "teamId": 1033
            },
            {
                "playerId": 5338,
                "teamId": 1033
            },
            {
                "playerId": 6006,
                "teamId": 1033
            },
            {
                "playerId": 6070,
                "teamId": 1033
            },
            {
                "playerId": 247,
                "teamId": 1062
            },
            {
                "playerId": 525,
                "teamId": 1062
            },
            {
                "playerId": 603,
                "teamId": 1062
            },
            {
                "playerId": 628,
                "teamId": 1062
            },
            {
                "playerId": 961,
                "teamId": 1062
            },
            {
                "playerId": 1137,
                "teamId": 1062
            },
            {
                "playerId": 3708,
                "teamId": 1062
            },
            {
                "playerId": 3736,
                "teamId": 1062
            },
            {
                "playerId": 5402,
                "teamId": 1062
            },
            {
                "playerId": 329,
                "teamId": 1065
            },
            {
                "playerId": 1913,
                "teamId": 1065
            },
            {
                "playerId": 2015,
                "teamId": 1065
            },
            {
                "playerId": 2443,
                "teamId": 1065
            },
            {
                "playerId": 3358,
                "teamId": 1065
            },
            {
                "playerId": 3544,
                "teamId": 1065
            },
            {
                "playerId": 4320,
                "teamId": 1065
            },
            {
                "playerId": 4506,
                "teamId": 1065
            },
            {
                "playerId": 4826,
                "teamId": 1065
            },
            {
                "playerId": 5238,
                "teamId": 1065
            },
            {
                "playerId": 5283,
                "teamId": 1065
            },
            {
                "playerId": 5439,
                "teamId": 1065
            },
            {
                "playerId": 5742,
                "teamId": 1065
            },
            {
                "playerId": 5891,
                "teamId": 1065
            },
            {
                "playerId": 6183,
                "teamId": 1065
            }
        ];

    $scope.removeFromRosterTest.removeAll = function () {
        $scope.removeFromRosterTest.index = 0;
        $scope.removeFromRosterTest.timerId = setInterval($scope.removeFromRosterTest.removeNext, 1000);
    }

    $scope.removeFromRosterTest.removeSingle = function () {
        authFactory.removeFromRoster($scope.removeFromRosterTest, $scope.removeFromRosterTest.playerId, $scope.removeFromRosterTest.teamId);
    }

    $scope.removeFromRosterTest.removeNext = function () {
        var index = $scope.removeFromRosterTest.index;
        if (index >= $scope.removeFromRosterTest.playerList.length) {
            clearInterval($scope.removeFromRosterTest.timerId);
        } else {
            var item = $scope.removeFromRosterTest.playerList[index];
            console.log("Removing User " + item.playerId + " from team Id: " + item.teamId) + "\n";
            authFactory.removeFromRoster($scope.mergeDupTests, item.playerId, item.teamId);
            $scope.removeFromRosterTest.index++;
        }
    }

    $scope.$watch('removeFromRosterTest.removeFromRosterResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.removeFromRosterTest.removeFromRosterResult.error) {
                console.log("-- Error: " + $scope.removeFromRosterTest.removeFromRosterResult.error) + "\n";
            } else {
                console.log("Result: " + $scope.removeFromRosterTest.removeFromRosterResult + ", message = " + $scope.removeFromRosterTest.removeFromRosterResult.message);
            }
        }
    });

    // ------------ End of Remove From Roster Tool   ------------

    // ------------ Elgible Team Test   ------------
    $scope.eligibleTeamsTest = {};

    $scope.eligibleTeamsTest.getTeams = function () {
        authFactory.getEligibleTeams($scope.eligibleTeamsTest, authFactory.year, $scope.eligibleTeamsTest.userId);
    }

    // ------------ End of Elgible Team Test   ------------


    $scope.quickTest = function () {
        Utilities.log("Running Test ...");
        RunTest();
    }

    $scope.gamesTest = function () {
        Utilities.log("Calling scheduleFactory.init ...");
        scheduleFactory.init();
    }

    //GetYears();
    //GetShortFieldNames();
    //scheduleFactory.init();
    //dataFactory.loadTeamNames($scope, 2015);

    function RunTest() {
        Utilities.log("Calling RunTest");
        dataFactory.getYearInfo()
            .success(function (result) {
                $scope.testResult = result[0];
                Utilities.log("... GetTest Succeeded: retrieved " + String(result));
            })
            .error(function (error) {
                $scope.testResult = 'Unable to load test: ' + error.message;
                Utilities.log("... GetTest Failed");
            });
    }

    function RunAllTests(results) {
        //dataFactory.getFieldCount(results);
        //dataFactory.getFields(results, 2, 20, null);
        //dataFactory.getFieldInfo(results, 16);
        //dataFactory.getShortFieldNames(results);
        //dataFactory.getPlayerName(results, 666);
        //dataFactory.getRegisteredPlayers(results, 2015, 3, 25);
        //dataFactory.getTaxiPlayers(results, 2015, 2, 20);
        //dataFactory.getDraftPlayers(results, 2015, 3, 30);
        //dataFactory.getPlayerCount(results, 2015, "Registered");
        //dataFactory.getRoster(results, 500);
        //dataFactory.getDivisions(results, 2015);
        //dataFactory.getTeams(results, 2015, "Adirondack", null);
        //dataFactory.getTeamNames(results, 2014);
        //dataFactory.getTeamNames(results, 2015);
        //dataFactory.getFranchise(results, 600);
        //dataFactory.getTest(results);
        //dataFactory.loadTeamNames($scope, 2015);
        //dataFactory.loadTeamNames($scope, 2014);

        //scheduleFactory.getCurrentYear(results);
        //scheduleFactory.getYears(results);
        //scheduleFactory.getYearInfo(results, 2015);
        scheduleFactory.getStandings(results, 2015, "Adirondack");
    }

});
