var app = angular.module('pcblApp', ['ui.bootstrap', 'ngRoute', 'ngSanitize', 'ngCkeditor', 'ui.bootstrap']);

app.config(['$routeProvider',
  function ($routeProvider) {
      $routeProvider
        .when("/", {
          templateUrl: "partials/home.html",
          controller: "mainController",
        })
        .when("/login", {
          templateUrl: "partials/login.html",
          controller: "authController",
        })
        .when("/login/:email/:token", {
          templateUrl: "partials/login.html",
          controller: "authController",
        })
        .when("/signin/:startPage", {
          templateUrl: "partials/login.html",
          controller: "authController",
        })
        .when("/fields", {
          templateUrl: "partials/fields.html",
          controller: "fieldController",
        })
        .when("/fields/:fieldId", {
          templateUrl: "partials/field-detail.html",
          controller: "fieldController",
        })
        .when("/afterGame/:fieldId", {
          templateUrl: "partials/after-game.html",
          controller: "fieldController",
        })
        .when("/players/Draft/:year", {
          templateUrl: "partials/draft-players.html",
          controller: "playerListController",
        })
        .when("/players/FreeAgents/:year", {
          templateUrl: "partials/free-agents.html",
          controller: "playerListController",
        })
        .when("/players/Registered/:year", {
          templateUrl: "partials/registered-players.html",
          controller: "playerListController",
        })
        .when("/players/Taxi/:year", {
          templateUrl: "partials/taxi-players.html",
          controller: "playerListController",
        })
        .when("/player/:playerId", {
          templateUrl: "partials/player.html",
          controller: "playerController",
        })
        .when("/player/season/:playerId/:year", {
          templateUrl: "partials/player-log.html",
          controller: "playerController",
        })
        .when("/player/schedule/:playerId/:year", {
          templateUrl: "partials/player.html",
          controller: "playerController",
        })
        .when("/player/profile/:playerId/:year", {
          templateUrl: "partials/player.html",
          controller: "playerController",
        })
        .when("/career", {
          templateUrl: "partials/career.html",
          controller: "playerController",
        })
        .when("/search", {
          templateUrl: "partials/career.html",
          controller: "playerController",
        })
        .when("/profile", {
          templateUrl: "partials/profile.html",
          controller: "authController",
        })
        .when("/profile/draft/:poolId", {
          templateUrl: "partials/draft-profile.html",
          controller: "playerController",
        })
        .when("/profile/freeAgent/:poolId", {
          templateUrl: "partials/freeAgent-profile.html",
          controller: "playerController",
        })
        .when("/freeAgent", {
          templateUrl: "partials/freeAgent-signup.html",
          controller: "adminController",
        })
        .when("/draft", {
          templateUrl: "partials/draft-signup.html",
          controller: "adminController",
        })
        .when("/draft/board", {
          templateUrl: "partials/draft-manager.html",
          controller: "playerListController",
        })
        .when("/signup", {
          templateUrl: "partials/signup.html",
          controller: "adminController",
        })
        .when("/signup/:email/:token", {
          templateUrl: "partials/signup.html",
          controller: "adminController",
        })
        .when("/invite/:email/:teamId/:token", {
          templateUrl: "partials/signup.html",
          controller: "adminController",
        })
        .when("/team/:teamId/:teamName/:divisionName/:year", {
          templateUrl: "partials/team.html",
          controller: "teamController",
        })
        .when("/game/:gameId", {
          templateUrl: "partials/game.html",
          controller: "gameController",
        })
        .when("/league/:year", {
          templateUrl: "partials/league.html",
          controller: "leagueController",
        })
        .when("/division/:divisionName/:year", {
          templateUrl: "partials/division.html",
          controller: "divisionController",
        })
        .when("/articles/:contentId", {
          templateUrl: "partials/article.html",
          controller: "articleController",
        })
        .when("/articles/:contentId/:hash", {
          templateUrl: "partials/article.html",
          controller: "articleController",
        })
        .when("/message/:messageId", {
          templateUrl: "partials/message.html",
          controller: "articleController",
        })
        .when("/market", {
          templateUrl: "partials/market.html",
          controller: "mediaController",
        })
        .when("/media", {
          templateUrl: "partials/media.html",
          controller: "mediaController",
        })
        .when("/test", {
          templateUrl: "partials/test.html",
          controller: "testController",
        })
        .when("/registration", {
          templateUrl: "partials/registration.html",
          controller: "authController",
        })
        .when("/registration/:year/:playerId", {
          templateUrl: "partials/registration.html",
          controller: "authController",
        })
        .when("/register", {
          templateUrl: "partials/register.html",
          controller: "authController",
        })
        .when("/event", {
          templateUrl: "partials/event.html",
          controller: "authController",
        })
        .when("/dayLeague", {
          templateUrl: "partials/day-league.html",
          controller: "teamController",
        })
        .when("/waiver/:fromPage", {
          templateUrl: "partials/waiver.html",
          controller: "authController",
        })
        .when("/scorebook/:gameId/:teamId/:page", {
          templateUrl: "partials/scorebook.html",
          controller: "scorebookController",
        })
        .when("/admin", {
          templateUrl: "partials/admin.html",
          controller: "adminController",
        })
        .when("/admin/billing", {
          templateUrl: "partials/adminTransactions.html",
          controller: "adminController",
        })
        .when("/admin/billing/player", {
          templateUrl: "partials/adminBilling.html",
          controller: "adminController",
        })
        .when("/admin/billing/player/:registrationId/:playerId/:year", {
          templateUrl: "partials/adminBilling.html",
          controller: "adminController",
        })
        .when("/admin/buddy/:teamId/:divisionName/:teamName", {
          templateUrl: "partials/adminBuddy.html",
          controller: "adminController",
        })
        .when("/admin/content", {
          templateUrl: "partials/adminContent.html",
          controller: "adminController",
        })
        .when("/admin/createSeason", {
          templateUrl: "partials/adminCreateSeason.html",
          controller: "adminController",
        })
        .when("/admin/discipline", {
          templateUrl: "partials/adminDiscipline.html",
          controller: "adminController",
        })
        .when("/admin/mail", {
          templateUrl: "partials/adminMail.html",
          controller: "adminController",
        })
        .when("/admin/playoffs", {
          templateUrl: "partials/adminPlayoffs.html",
          controller: "adminController",
        })
        .when("/support", {
          templateUrl: "partials/adminSupport.html",
          controller: "adminController",
        })
        .when("/admin/player/:playerId", {
          templateUrl: "partials/adminRoster.html",
          controller: "adminController",
        })
        .when("/playerAdmin", {
          templateUrl: "partials/adminPlayer.html",
          controller: "playerController",
        })
        .when("/playerAdmin/:registrationId/:playerId/:year", {
          templateUrl: "partials/adminPlayer.html",
          controller: "playerController",
        })
        .when("/tryout", {
          templateUrl: "partials/adminTryout.html",
          controller: "playerController",
        })
        .when("/admin/scheduling", {
          templateUrl: "partials/adminSchedule.html",
          controller: "adminController",
        })
        .when("/admin/taxi", {
          templateUrl: "partials/adminTaxi.html",
          controller: "adminController",
        })
        .when("/admin/team/:teamId", {
          templateUrl: "partials/adminTeam.html",
          controller: "adminController",
        })
        .when("/admin/umpires", {
          templateUrl: "partials/adminUmpire.html",
          controller: "adminController",
        })
        .when("/admin/temp/:messageId", {
          templateUrl: "partials/adminTemp.html",
          controller: "adminController",
        })
        .when("/helpbot", {
          templateUrl: "partials/chat.html",
          controller: "helpbotController",
        })
        .otherwise({
          redirectTo: "/",
        });

      // use the HTML5 History API
      //$locationProvider.html5Mode(true);
  }]);

// TODO: Allow authentication so login sessions are preserved
app.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.defaults.withCredentials = true;
}]);

// Special Filters

app.filter('to_trusted', ['$sce', function ($sce) {
        return function (text) {
            return $sce.trustAsHtml(text);
        };
}]);


// ngEditor Simple controller placed here
app.controller('ngeditController', function ($scope, $http) {

    Utilities.log("Loading ngeditController...");

    $scope.editorOptions = {
        language: 'en',
        allowedContent: true,
        uiColor: '#FFE97F'
    };
    $scope.$on("ckeditor.ready", function (event) {
        $scope.isReady = true;
    });
    $scope.refresh = function () {
        Utilities.log("refresh");
    }
})
