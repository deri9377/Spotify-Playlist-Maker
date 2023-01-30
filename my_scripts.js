var clientId = 'fbd5a8a3bb4648c8b5cd9fc61d7845cd'

var http = require("http");

/* Create an HTTP server to handle responses */


    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
      q = window.location.hash.substring(1);
  while ( e = r.exec(q)) {
     hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

var userProfileSource = document.getElementById('user-profile-template').innerHTML,
    userProfileTemplate = Handlebars.compile(userProfileSource),
    userProfilePlaceholder = document.getElementById('user-profile');

var oauthSource = document.getElementById('oauth-template').innerHTML,
    oauthTemplate = Handlebars.compile(oauthSource),
    oauthPlaceholder = document.getElementById('oauth');

var params = getHashParams();

var access_token = params.access_token,
    refresh_token = params.refresh_token,
    error = params.error;

var userId = null;
var saved_playlists_url = [];
var saved_songs = [];
var saved_songs_uri = [];
var playlistId;
let artists = new Map();


function createPlaylist() {
  var jsonData = {
    'name': 'New Playlist'
  }

  $.ajax({
    type: 'POST',
    url: 'https://api.spotify.com/v1/users/22qtdpfnkccy46fg5wtitxy2i/playlists',
    data: JSON.stringify(jsonData),
    async: false,
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    success: function(response) {
      playlistId = response.id;
    }
  })

  for (var i = 0; i < saved_songs_uri.length - 100; i+= 100) {
    $.ajax({
        type: 'POST',
        url: 'https://api.spotify.com/v1/playlists/' + playlistId + '/tracks',
        headers: {
            'Authorization': 'Bearer ' + access_token
        },
        contentType: 'application/json',
        data: JSON.stringify(saved_songs_uri.slice(i, i+100)),
        success: function(response) {
          console.log(response);
        }
    })
  }



}




if (error) {
  alert('There was an error during the authentication');
} else {
  if (access_token) {
    // render oauth info
    oauthPlaceholder.innerHTML = oauthTemplate({
      access_token: access_token,
      refresh_token: refresh_token
    });

    $.ajax({
        url: 'https://api.spotify.com/v1/me',
        headers: {
          'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
          userProfilePlaceholder.innerHTML = userProfileTemplate(response);

          $('#login').hide();
          $('#loggedin').show();
        }
    });
  } else {
      // render initial screen
      $('#login').show();
      $('#loggedin').hide();
  }

  document.getElementById('obtain-new-token').addEventListener('click', function() {
    $.ajax({
      url: '/refresh_token',
      data: {
        'refresh_token': refresh_token
      }
    }).done(function(data) {
      access_token = data.access_token;
      oauthPlaceholder.innerHTML = oauthTemplate({
        access_token: access_token,
        refresh_token: refresh_token
      });
    });
  }, false);

  document.getElementById('get_playlists').addEventListener('click', function() {
    userId = document.getElementById('userId').innerHTML;
    console.log(userId);
    var total= 0;
    saved_playlists_url = [];
    $.ajax({
      url: 'https://api.spotify.com/v1/me/playlists?offset=0&limit=10',
      type: 'GET',
      headers: {
        'Authorization': 'Bearer ' +   access_token
      },
      success: function(response) {
        total = response.total;
        for (var i = 0; i < response.items.length; i++) {
          if (response.items[i].owner.id == userId) {
            saved_playlists_url.push(response.items[i].id);
          }
        }
        for (i = 50; i < total; i+=50){
          $.ajax({
            url: 'https://api.spotify.com/v1/me/playlists?offset=' + i +'&limit=50',
            type: 'GET',
            headers: {
              'Authorization': 'Bearer ' +   access_token
            },
            success: function(response) {
              for (var j = 0; j < response.items.length; j++) {
                saved_playlists_url.push(response.items[j].id);
              }
            }
          })
        }
      }
    })
  });


    document.getElementById('get_songs').addEventListener('click', function(){
      saved_songs= [];
      for (var i = 0; i < saved_playlists_url.length; i++) {
        $.ajax({
          url: 'https://api.spotify.com/v1/playlists/' + saved_playlists_url[i] + '/tracks',
          type: 'GET',
          async: false,
          headers: {
                'Authorization': 'Bearer ' +   access_token
          },
        success: function(response) {
          for (var j = 0; j < response.items.length; j++) {
            if (response.items[j].track != null && !saved_songs_uri.includes(response.items[j].track.uri)) {
              saved_songs.push(response.items[j].track);
              saved_songs_uri.push(response.items[j].track.uri);
              //addArtist(response.items[j].track.artists[0].id);
              console.log(response.items[j].track);
            }
          }
          var total = response.total;
          if (total > 100) {
            for (var j = 100; j < total; j+= 100) {
              overflow(response, saved_playlists_url[i], j);
            }
          }
        }
        })
      }
      console.log(saved_songs_uri.length);
      console.log(saved_songs.length);
    });

    function overflow(param, playlist, offset) {
    $.ajax({
      url: 'https://api.spotify.com/v1/playlists/' + playlist + '/tracks?offset=' + offset,
      type: 'GET',
      headers: {
          'Authorization': 'Bearer ' + access_token
      },
    success: function(response) {
      for (var z = 0; z < response.items.length; z++) {
        if (!saved_songs_uri.includes(response.items[z].track.uri)) {
          saved_songs.push(response.items[z].track);
          saved_songs_uri.push(response.items[z].track.uri);
          //addArtist(response.items[z].track.artists[0].id);
          //console.log(response.items[z].track);
        }
      }
    }
    })
}

    function addArtist(artistId) {
      if (!artists.has(artistId)) {
        $.ajax({
          url: 'https://api.spotify.com/v1/artists/' + artistId,
          headers: {
             'Authorization': 'Bearer ' + access_token
          },
          success: function (response) {
            artists.set(artistId, response);
          }
        })
      }
    }

    document.getElementById('create_playlist').addEventListener('click', function() {
      createPlaylist();
    });
}