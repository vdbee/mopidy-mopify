'use strict';

angular.module('mopify.music.tracklist', [
    'ngRoute',
    'mopify.services.mopidy',
    'mopify.services.util',
    'mopify.services.station',
    'mopify.services.spotifylogin',
    'mopify.services.servicemanager',
    'spotify',
    'ngSanitize',
    'mopify.widgets.directive.track',
    'infinite-scroll'
])

/**
 * Every controller start with defining its own routes.
 */
.config(function($routeProvider) {
    $routeProvider.when("/music/tracklist/:uri/:name?", {
        templateUrl: "music/tracklist/tracklist.tmpl.html",
        controller: "TracklistController"
    });
})

/**
 * After defining the routes we create the controller for this module
 */
.controller("TracklistController", function TracklistController($scope, $timeout, $routeParams, mopidyservice, stationservice, util, Spotify, SpotifyLogin, ServiceManager){
    // Grab params in var
    var uri = $routeParams.uri;

    // Set default coverimage
    $scope.coverImage = "./assets/images/playlists-header.jpg";

    // Check mopidy state and call loadtracks function
    $scope.$on("mopidy:state:online", loadTracks);
    $scope.$on("mopidy:state:online", loadCurrentTrack);
    
    // Load tracks when connected
    if(mopidyservice.isConnected){
        loadTracks();
        loadCurrentTrack();
    }

    // Define the type from the uri parameter
    if(uri.indexOf(":playlist:") > -1)
        $scope.type = "Playlist";

    if(uri.indexOf(":album:") > -1)
        $scope.type = "Album";    

    if(uri.indexOf("mopidy:current") > -1){
        $scope.type = "tracklist";    
        $scope.coverImage = "./assets/images/tracklist-header.jpg";
    }

    // Check if this is a playlist from the loggedin Spotify user
    if($scope.type == "Playlist"){
        $scope.isowner = false;
        var ownerid = uri.split(":")[2];

        Spotify.getCurrentUser().then(function(data){
            if(ownerid == data.id){
                $scope.isowner = true;            }
        });
    }

    // Check if a name has been defined
    $scope.name = ($routeParams.name !== undefined) ? $routeParams.name : ((uri.indexOf("mopidy:") > -1) ? "Current tracklist" : "");
    $scope.tracks = [];
    $scope.currentPlayingTrack = {};

    var loadedTracks = [];

    if($scope.type == "Playlist"){
        loadSpotifyInfo();
    }

    /**
     * Load the tracks from the mopidy library
     */
    function loadTracks(){    
        // Get curren tracklist from Mopidy
        if(uri.indexOf("mopidy:") > -1){
            mopidyservice.getTracklist().then(function(tracks){

                var mappedTracks = tracks.map(function(tltrack){
                    return tltrack.track;
                });

                $scope.tracks = angular.copy(mappedTracks);
            });

            $scope.$on('mopidy:event:tracklistChanged', loadTracks);
        }

        // Lookup the tracks for the given album or playlist
        if(uri.indexOf("spotify:") > -1){
            mopidyservice.lookup(uri).then(function(tracks){
                // Check if the $scope.tracks contains loading tracks
                var loadingTracks = false;

                _.each(tracks, function(track){
                    if(track.name.indexOf("[loading]") > -1)
                        loadingTracks = true;
                });

                if(loadingTracks){
                    $timeout(loadTracks, 1000);
                }
                else{
                    loadedTracks = angular.copy(tracks);

                    var random = Math.floor((Math.random() * tracks.length) + 0);

                    if($scope.type == "Album")
                        getCoverImage(tracks[random]);

                    $scope.getMoreTracks();
                }
            });

        }
    }

    /**
     * Load information about the playlist from Spotify
     */
    function loadSpotifyInfo(){
        var splitteduri = uri.split(":");
        var userid = splitteduri[2];
        var playlistid = splitteduri[4];

        if(ServiceManager.isEnabled("spotify") && SpotifyLogin.connected){
            Spotify.getPlaylist(userid, playlistid).then(function(data){
                $scope.name = data.name + " from " + data.owner.id;
            });    
        }
        else{
            $scope.name = "Playlist from " + userid;
        }
    }

    /**
     * Load the current playing track
     */
    function loadCurrentTrack(){
        mopidyservice.getCurrentTrack().then(function(track){
            $scope.currentPlayingTrack = track;
        });

        // Update information on a new track 
        $scope.$on('mopidy:event:trackPlaybackEnded', function(event, data) {
            if(data.tl_track !== undefined)
                $scope.currentPlayingTrack = data.tl_track.track;
        });
        $scope.$on('mopidy:event:trackPlaybackStarted', function(event, data) {
            if(data.tl_track !== undefined)
                $scope.currentPlayingTrack = data.tl_track.track;
        });
    }

    /**
     * Get an album image from Spotify
     * @param  {track} track
     */
    function getCoverImage(track){
        Spotify.getTrack(track.uri).then(function(data) {
            $scope.coverImage = data.album.images[0].url;
        });
    }

    /**
     * Add the current tracks to the tracklist, shuffle them and play
     */
    $scope.shuffle = function(){
        if(mopidyservice.isConnected){
            mopidyservice.clearTracklist().then(function(){

                mopidyservice.addToTracklist({ uri: uri }).then(function(){
                    mopidyservice.shuffleTracklist().then(function(){
                        mopidyservice.play();    
                    });
                });

            });
            
        }
    };

    /**
     * Start a new station based on the tracks in the current view
     */
    $scope.startStation = function(){
        if(uri.indexOf("spotify:") > -1)
            stationservice.startFromSpotifyUri(uri);

        if(uri.indexOf("mopidy:") > -1)
            stationservice.startFromTracks($scope.tracks);
    };

    var tracksPerCall = 50;

    /*
     * Add {trackspercall} tracks to the scope
     * This function is used in combination with infinite scroll
     */
    $scope.getMoreTracks = function(){
        if(loadedTracks.length > 0){
            var current = $scope.tracks;
            var toAdd = loadedTracks.splice(0, tracksPerCall);
            
            $scope.tracks = current.concat(toAdd);
        }
    };

});