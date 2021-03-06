angular.module("mopify.services.servicemanager", [
    "LocalStorageModule"
])

.factory("ServiceManager", function($rootScope, $window, localStorageService){
    "use strict";

    var rootkey = "settings";

    function ServiceManager(){
        this.availableServices = [
            {
                name: "Spotify",
                description: "Search and manage playlists and get the latests charts",
                image: "http://icons.iconarchive.com/icons/danleech/simple/256/spotify-icon.png",
                hasSettings: false
            },
            {
                name: "Taste Profile",
                description: "Stores tracks anonymously in a so called TasteProfile which is used to feed the 'Browse' page with recommendations.",
                image: "./assets/images/echonest-logo.jpg",
                hasSettings: true
            }
            /*{
                name: "Facebook",
                description: "Get more music based on your Facebook likes.",
                image: "http://www.ednfoundation.org/wp-content/uploads/facebook-logo-square.png",
                connected: ($scope.connectedServices !== null) ? $scope.connectedServices.facebook : false
            }*/
        ];

       this.initializeSavedObject();
    }

    ServiceManager.prototype.initializeSavedObject = function(){
        var that = this;
        var trackedservices = localStorageService.get("services");

        if(trackedservices === null){
            trackedservices = {};
        }

        for(var x = 0; x < that.availableServices.length; x++){
            var service = that.availableServices[x];
            var servicename = service.name.replace(" ", "").toLowerCase();

            if(trackedservices[servicename] === undefined)
                trackedservices[servicename] = false;
        }

        localStorageService.set("services", trackedservices);
    };

    ServiceManager.prototype.getAvailableServices = function() {
        return this.availableServices;
    };

    ServiceManager.prototype.getEnabledServices = function() {
        return localStorageService.get("services");
    };

    ServiceManager.prototype.enableService = function(service) {
        var servicename = service.name.replace(" ", "").toLowerCase();
        var services = localStorageService.get("services");

        services[servicename] = true;

        // Save to the localstorage
        localStorageService.set("services", services);

        // Broadcast this change
        $rootScope.$broadcast("mopify:services:enabled", service);

        // Send to GA
        $window.ga('send', 'event', 'service', 'enabled', servicename);
    };

    ServiceManager.prototype.disableService = function(service) {
        var servicename = service.name.replace(" ", "").toLowerCase();
        var services = localStorageService.get("services");

        services[servicename] = false;

        // Save to the localstorage
        localStorageService.set("services", services);
        
        // Broadcast this change
        $rootScope.$broadcast("mopify:services:disabled", service);

        // Send to GA
        $window.ga('send', 'event', 'service', 'disabled', servicename);
    };    

    ServiceManager.prototype.isEnabled = function(service) {
        var servicename = (typeof service === "string") ? service.replace(" ", "").toLowerCase() : service.name.replace(" ", "").toLowerCase();
        return localStorageService.get("services")[servicename];
    };


    return new ServiceManager();
});