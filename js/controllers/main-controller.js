app.controller('mainController', function ($scope, $location, dataFactory, scheduleFactory) {

    Utilities.log("Loading mainController...");
    $scope.controllerName = "mainController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    // Initialize variables
    $scope.currentPage = 1;
    $scope.itemsPerPage = 10;
    $scope.recentClass = "panel-heading-inactive";
    $scope.upcomingClass = "panel-heading-active";
    $scope.scoreClass = "score-upcoming";
    $scope.loadingData = true;

    // Link to season-dependent constants
    $scope.season = dataFactory.season;
    season = dataFactory.season;
    $scope.leagueYear = season.currentYear;

    // :========= Blogger ============:
    $scope.main = {};
    $scope.main.library = [];
    $scope.main.blogList = [];
    $scope.main.blogListUpdated = false;
    // Don't allow caching until bug is figured out
    dataFactory.loadContentLibrary($scope.main, false);

    $scope.main.setBlogPage = function (index) {
        Utilities.log("Blog Page set to" + index);
        //console.trace("blog page");
        if ($scope.main.blogList) {
            $scope.main.totalBlogPages = $scope.main.blogList.length;
            $scope.main.currentBlogPage = $scope.main.blogList[index - 1];
            $scope.main.blogPage = index;
        }
        GetBlogPosts();
    }

    // Special Front Page content
    $scope.main.signup = function () {
        $location.path("/signup");
    }

    $scope.getReadLabel = function (blogArticle) {
        if (blogArticle && blogArticle.hasTeaser) return "Read More ...";
        return "Read";
    }

    $scope.$watch('main.library', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if (dataFactory.content.library && !$scope.main.blogListUpdated) {
                $scope.main.library = dataFactory.content.library;
                $scope.main.blogList = dataFactory.createBlogList($scope.main.library)

                // Initialize the blog list
                $scope.main.setBlogPage(1);
                $scope.main.blogListUpdated = true;
            }
        }
    });

    $scope.$watch('blogArticles', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
        }
    });

    // :======== Ad Rotator ==========:
    $scope.adRef = undefined;
    $scope.adSrc = undefined;
    $scope.currentAd = undefined;
    $scope.adList = null;

    // *** Ad Rotator ***

    dataFactory.getAds($scope);

    $scope.initAds = function () {
        // This is a callback function that is called after the adList
        // is loaded.
        // Ad selection is based on one of three strategies:
        //  Random: choose an ad at random
        //  Timed: rotate after fixed number of minutes
        //  Daily: rotate on daily basis
        // Method will later be set externally, but for now, it is hardcoded
        var method = "Timed";
        var minuteInterval = 15;
        var dateTime = new Date();
        var adCount = $scope.adList.length;
        
        switch (method) {
            case "Random":
                $scope.currentAd = Math.floor(Math.random() * adCount);
                break;
            case "Timed":
                minuteCount = 60 * dateTime.getHours() + dateTime.getMinutes();
                $scope.currentAd = Math.floor(minuteCount / minuteInterval) % adCount;
                break;
            case "Daily":
                var oneJan = new Date(dateTime.getFullYear(), 0, 1);
                var dayOfYear = Math.ceil((this - onejan) / 86400000);
                $scope.currentAd = dayOfYear % adCount;
                break;
        }
        Utilities.log(">Set Ad using " + method + ": " + $scope.currentAd);
        $scope.adSrc = $scope.adList[$scope.currentAd].src;
        $scope.adRef = $scope.adList[$scope.currentAd].href;
    }

    $scope.clickAd = function (event) {
        // Test access to hidden functionality
        Utilities.log(">>Click at " + event.offsetX + ", " + event.offsetY);
        // Ignore unless in right margin
        if (event.offsetX > 350) {
            // If ctrl key is held, toggle logging;
            // otherwise rotate ad
            if (event.ctrlKey) {
                Utilities.enableLogging();
            } else {
                $scope.rotateAd();
            }
        }
    }

    $scope.rotateAd = function () {
       Utilities.log("Calling rotateAd ...");
        $scope.currentAd++;
        if ($scope.currentAd >= $scope.adList.length) $scope.currentAd = 0;
        $scope.adSrc = $scope.adList[$scope.currentAd].src;
        $scope.adRef = $scope.adList[$scope.currentAd].href;
       Utilities.log("current ad is now = " + $scope.currentAd)
       Utilities.log("current img is now = " + $scope.adSrc)
       Utilities.log("current link is now = " + $scope.adRef)
    }

    // *** Recent/Upcoming Games ***

    $scope.games = null;
    GetGames();

    $scope.movePage = function (change) {
        $scope.currentPage += change;
        if ($scope.currentPage == 0 && change < 0) $scope.currentPage = -1;
        if ($scope.currentPage == 0 && change > 0) $scope.currentPage = 1;
        SetGamePage();
    }

    $scope.setPage = function (page) {
        $scope.currentPage = page;
        SetGamePage();
    }

    $scope.emptyList = function () {
        return !($scope.games && $scope.games.length != 0);
    }

    // *** Schedule functions that get inherited by other controllers ***

    $scope.showScore = function (game, whichTeam) {
        // Only return if game is complete
        if (game.outcome == "finished") {
            if (whichTeam == "Home") return game.homeRuns;
            if (whichTeam == "Away") return game.awayRuns;
        }
    }

    $scope.isPlayoff = function (game) {
        return (game && game.playoffRound && (Number(game.playoffRound) > 0)) ? "playoff-game" : "";
    }

    // Twitter feed experimental
    $scope.initTwitter = function () {
        window.twttr.widgets.load(document.getElementById("twitterFeed"));
    }

    // Local Functions

    function SetGamePage() {

        if ($scope.currentPage > 0) {
            $scope.recentClass = "panel-heading-inactive";
            $scope.upcomingClass = "panel-heading-active";
            $scope.scoreClass = "score-upcoming";
        } else {
            $scope.recentClass = "panel-heading-active";
            $scope.upcomingClass = "panel-heading-inactive";
            $scope.scoreClass = "score-recent";
        }
        GetGames();
    }

    function GetGames() {
       Utilities.log("Calling GetGames");
        page = $scope.currentPage;
        restriction = "Upcoming";
        if (page < 0) {
            page = -page;
            restriction = "Recent";
        }
        scheduleFactory.getGames($scope, { year: $scope.leagueYear, page: (page - 1), perPage: $scope.itemsPerPage, restrict: restriction, scheduleType: "homePage" });
    }

    function GetBlogPosts() {
        Utilities.log("Calling GetBlogPosts");
        for (var index = 0; index < $scope.main.currentBlogPage.length; index++) {
            var article = $scope.main.currentBlogPage[index];
            // It's possible things got messed up, so fail somewhat gracefully if a blog post is missing
            if (!article) {
                article = {};
                article.title = "(Article not found)";
                article.type = "blog";
                article.contentId = "article-not-found";
                article.author = "";
                article.dateTime = new Date();
                article.hasTeaser = false;
                article.pageIndex = index;
                $scope.main.currentBlogPage[index] = article;
            }
            Utilities.log("Fetching " + article.contentId);
            if (!article.html) dataFactory.getBlogArticle(article);
        }
    }
});

// masterController is a lightweight, top-level controller
app.controller('masterController', function ($scope, dataFactory) {

    Utilities.log("Loading masterController...");
    $scope.controllerName = "masterController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    // Handles toggel to full screen mode, which suppresses header and footer
    $scope.master = {};
    $scope.master.fullScreen = false;

    // Generate list of available years
    $scope.season = dataFactory.season;
    $scope.master.yearList = dataFactory.yearsSince(dataFactory.season.firstYear, false);


    // Twitter feed experimental
    $scope.initTwitter = function () {
        feedId = document.getElementById("twitterFeed");
        window.twttr.widgets.load();
    }



});

