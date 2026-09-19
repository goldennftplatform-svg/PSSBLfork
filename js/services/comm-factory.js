app.factory('commFactory', [function () {

    var commFactory = {};

    // We will get and set parameters for access between controllers
    var parameters = {};

    commFactory.getParameter = function (parameterName) {
       Utilities.log("getParameter: " + parameterName + "(" + parameters[parameterName] + ")");
        return parameters[parameterName];
    };

    commFactory.setParameter = function (parameterName, value) {
       Utilities.log("setParameters: " + parameterName + "(" + value + ")");
        parameters[parameterName] = value;
    };

    return commFactory;
}]);