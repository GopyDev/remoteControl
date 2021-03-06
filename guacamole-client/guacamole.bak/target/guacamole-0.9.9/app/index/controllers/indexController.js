/*
 * Copyright (C) 2015 Glyptodon LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * The controller for the root of the application.
 */
angular.module('index').controller('indexController', ['$scope', '$injector',
        function indexController($scope, $injector) {

    // Required services
    var $document        = $injector.get('$document');
    var $window          = $injector.get('$window');
    var guacNotification = $injector.get('guacNotification');
    var $route                = $injector.get('$route');

    /**
     * The notification service.
     */
    $scope.guacNotification = guacNotification;

    /**
     * The message to display to the user as instructions for the login
     * process.
     *
     * @type String
     */
    $scope.loginHelpText = null;

    /**
     * The credentials that the authentication service is has already accepted,
     * pending additional credentials, if any. If the user is logged in, or no
     * credentials have been accepted, this will be null. If credentials have
     * been accepted, this will be a map of name/value pairs corresponding to
     * the parameters submitted in a previous authentication attempt.
     *
     * @type Object.<String, String>
     */
    $scope.acceptedCredentials = null;

    /**
     * The credentials that the authentication service is currently expecting,
     * if any. If the user is logged in, this will be null.
     *
     * @type Field[]
     */
    $scope.expectedCredentials = null;

    /**
     * Basic page-level information.
     */
    $scope.page = {

        /**
         * The title of the page.
         * 
         * @type String
         */
        title: '',

        /**
         * The name of the CSS class to apply to the page body, if any.
         *
         * @type String
         */
        bodyClassName: ''

    };

    // Create event listeners at the global level
    var keyboard = new Guacamole.Keyboard($document[0]);

    // Broadcast keydown events
    keyboard.onkeydown = function onkeydown(keysym) {

        // Do not handle key events if not logged in
        if ($scope.expectedCredentials)
            return true;

        // Warn of pending keydown
        var guacBeforeKeydownEvent = $scope.$broadcast('guacBeforeKeydown', keysym, keyboard);
        if (guacBeforeKeydownEvent.defaultPrevented)
            return true;

        // If not prevented via guacBeforeKeydown, fire corresponding keydown event
        var guacKeydownEvent = $scope.$broadcast('guacKeydown', keysym, keyboard);
        return !guacKeydownEvent.defaultPrevented;

    };

    // Broadcast keyup events
    keyboard.onkeyup = function onkeyup(keysym) {

        // Do not handle key events if not logged in
        if ($scope.expectedCredentials)
            return;

        // Warn of pending keyup
        var guacBeforeKeydownEvent = $scope.$broadcast('guacBeforeKeyup', keysym, keyboard);
        if (guacBeforeKeydownEvent.defaultPrevented)
            return;

        // If not prevented via guacBeforeKeyup, fire corresponding keydown event
        $scope.$broadcast('guacKeyup', keysym, keyboard);

    };

    // Release all keys when window loses focus
    $window.onblur = function () {
        keyboard.reset();
    };

    // Display login screen if a whole new set of credentials is needed
    $scope.$on('guacInvalidCredentials', function loginInvalid(event, parameters, error) {
        $scope.page.title = 'APP.NAME';
        $scope.page.bodyClassName = '';
        $scope.loginHelpText = null;
        $scope.acceptedCredentials = {};
        $scope.expectedCredentials = error.expected;
    });

    // Prompt for remaining credentials if provided credentials were not enough
    $scope.$on('guacInsufficientCredentials', function loginInsufficient(event, parameters, error) {
        $scope.page.title = 'APP.NAME';
        $scope.page.bodyClassName = '';
        $scope.loginHelpText = error.message;
        $scope.acceptedCredentials = parameters;
        $scope.expectedCredentials = error.expected;
    });

    // Clear login screen if login was successful
    $scope.$on('guacLogin', function loginSuccessful() {
        $scope.loginHelpText = null;
        $scope.acceptedCredentials = null;
        $scope.expectedCredentials = null;
    });

    // Update title and CSS class upon navigation
    $scope.$on('$routeChangeSuccess', function(event, current, previous) {
       
        // If the current route is available
        if (current.$$route) {

            // Set title
            var title = current.$$route.title;
            if (title)
                $scope.page.title = title;

            // Set body CSS class
            $scope.page.bodyClassName = current.$$route.bodyClassName || '';
        }

    });

    $(window).bind('resize', function(e)
    {
        var logged = document.getElementById('content');
        if (logged != null){
          if (window.RT) clearTimeout(window.RT);
          window.RT = setTimeout(function()
          {
            alert("22222222222222222");
            $route.reload();
          }, 100);
      }
    });
/*
    // The ID of the extension we want to talk to.
    var editorExtensionId = "npeefbcdhnfpefakhdpljllcbpegkopl";
    var hasExtension = false;
    //var url = "https://chrome.google.com/webstore/detail/v2-cloud-clipboard/npeefbcdhnfpefakhdpljllcbpegkopl";

    // Make a simple request:
    chrome.runtime.sendMessage(editorExtensionId, {openUrlInEditor: url},
      function(response) {
        alert("11111111111111111");
        if (response.success)
          hasExtension = true;
      }
    );

    if(!hasExtension)
        alert("Not installed!!!");
    else
        alert("Installed!!!");
*/

/*    var id = "npeefbcdhnfpefakhdpljllcbpegkopl";
    chrome.management.get(id, function(ex) {
      alert("111111111111111111111111");
      console.log("Checking",ex,"-",id);
      if(!ex.enabled){
        alert("Not installed " + ex.name);
        //chrome.management.setEnabled(id,true);
      }
      else{
        alert("Already installed " + ex.name);
      }
    });
*/
    //alert(chrome.runtime);
}]);
