app.directive('scheduleDirective', function () {
    return {
        restrict: 'AE',
        replace: 'true',
        require: 'ngModel',
        templateUrl: 'templates/schedule-template.html'
    };
});

/*
This directive allows us to pass a function in on an enter key to do what we want.
Tack it on here instead of creating a new file
 */
app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
});

app.directive('draggable', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element[0].addEventListener('dragstart', scope.handleDragStart, false);
            element[0].addEventListener('dragend', scope.handleDragEnd, false);
        }
    }
});

app.directive('droppable', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element[0].addEventListener('drop', scope.handleDrop, false);
            element[0].addEventListener('dragover', scope.handleDragOver, false);
        }
    }
});

app.directive('adminDirective', function () {
    return {
        restrict: 'AE',
        replace: 'true',
        templateUrl: 'templates/admin-menu-template.html'
    }
});

app.directive('creditDirective', function () {
    return {
        restrict: 'E',
        replace: 'true',
        templateUrl: 'templates/credit-template.html'
    }
});

app.directive('checkImage', function () {
    return {
        link: function (scope, element, attrs) {
            element.bind('error', function () {
                element.attr('src', '/data/upload/photos/draft/missing.png'); // set default image
            });
        }
    }
});

app.directive('checkBracket', function () {
    return {
        link: function (scope, element, attrs) {
            element.bind('error', function () {
                element.attr('src', '/playoffs/missing.png'); // set default image
            });
        }
    }
});

app.directive("tryoutTile", function ()
{
    return {
        restrict: 'E',
        scope: {
            bib: '@',
            firstname: '@',
            lastname: '@',
            age: '@'
        },
        templateUrl: 'templates/tryout-tile-template.html',
        link: function(scope, element, attrs) {
            scope.canvas = element.find('canvas')[0];
            scope.context = scope.canvas.getContext('2d');

            // Draw the bib number
            scope.context.font = "24px Arial";
            scope.context.fillStyle = "black";
            var xPos = 12;
            if (scope.bib < 100) xPos += 8;
            if (scope.bib < 10) xPos += 8;
            scope.context.fillText(scope.bib, xPos, 32);

            // Draw the first name
            scope.context.font = "16px Arial";
            scope.context.fillStyle = "blue";
            scope.context.fillText(scope.firstname, 64, 22);

            // Draw the last name
            scope.context.font = "22px Arial";
            if (scope.lastname.length > 8) scope.context.font = "16px Arial";
            scope.context.fillText(scope.lastname, 64, 42);

            // Draw the age
            scope.context.font = "16px Arial";
            scope.context.fillStyle = "cyan";
            scope.context.fillText(scope.age, 130, 22);
        }        
    };
});