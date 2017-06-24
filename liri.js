"use strict";

const keys = require('./keys');
const filesystem = require('fs');
const readline = require('readline');
const path = require('path');
const req = require('request');
const Twitter = require('twitter');
const moment = require('moment');

const twitterKeys = keys.twitterKeys;

const randomTextFile = path.join(__dirname, 'random.txt');

const file = readline.createInterface({
    input: filesystem.createReadStream(randomTextFile),
    output: process.stdout,
    terminal: false
});

let user_command        = process.argv[2];
let user_arguments      = process.argv[3];
let user_extraarguments = process.argv[4];

let preventWrite = false;

const twitter = new Twitter(twitterKeys);

//----------------------------------------------------------------------

/**
 * Application entry point.
 */
const main = () =>
{
    if (!user_command)
    {
        console.log( "Usage: liri <cmd> < [arg1] [arg2] ...>" );
        console.log( "       liri my-tweets");
        console.log( "       liri spotify-this-song <song title | song keyword>");
        console.log( "       liri movie-this <movie title | move keyword" );
        console.log( "       liri do-what-it-says <command file>");

        return;
    }

    return runCommand(user_command);
};

const runCommand = (command) =>
{
    switch (command)
    {
        case "my-tweets":
        case "tweet":
            fetchTweets();
            logCommand('my-tweets', '', '');
        break;

        case "spotify-this-song":
        case "spotify":
            fetchSong(user_command, parseInt(user_arguments) ? parseInt(user_extraarguments) : 1);
            logCommand('spotify-this-song', `${user_arguments}`, user_extraarguments);
        break;

        case "movie-this":
        case "movie":
            fetchMovie(user_command);
            logCommand('movie-this',  user_command ? user_command : '', '');
        break;

        case "do-what-it-says":
        case "whatever":
            runCommandFile();
        break;

        default:
            console.warn(`Unable to find the command` + user_command );
        return;
    }
};

const fetchTweets = (username = 'totallypr') =>
{
    twitter
    .get('statuses/user_timeline',
    {
        screen_name: username.trim(),
        count: 20
    }, function (error, tweets)
    {
        if(error)
            throw error;

        let i = 0;
        tweets
        .forEach(function()
        {
            let time = moment(tweets[i].created_at, 'dd MMM DD HH:mm:ss ZZ YYYY', 'en').format('MM/DD/YYYY hh:mm A');

            console.log(`${time}: ${tweets[i].text}`);
            i++;
        });

        i = 0;
    });
};

const fetchSong = (song = 'the sign', listLimit = 1) =>
{
        if(!song)
            throw new Error('Missing song title');

    req(`https://api.spotify.com/v1/search?type=track&q=${song}&limit=20`, function (err, res)
    {
        if (err)
            throw new err;

        const json = JSON.parse(res.body);

        let curListCount = 0;

        json.tracks.items.some(function(data)
        {
            let info = data;
            let artistName = info.artists[0].name;
            let songName = info.name;
            let prev_URL = info.preview_url;
            let album = info.album.name;

            if (songName.toLowerCase() == song.toLowerCase())
            {
                console.log(`Song: ${songName}\nArtist Name: ${artistName}\nAlbum: ${album}\nPreview URL: ${prev_URL}\n`);

                curListCount++;
                if (curListCount == listLimit)
                    return true;  // Break out of the loop if we reach the listing limit.
            }
        });

        if (curListCount == 0)
            return console.log(`We could not find the song you were looking for.`.yellow);

    });
};

const fetchMovie = (movie = 'mr nobody') =>
{

    req(`http://www.omdbapi.com/?t=${movie}&plot=short&r=json&tomatoes=true`, function (err, res)
    {
        const json = JSON.parse(res.body);

        const title = json.Title;
        const year = json.Year;
        const imdbRating = json.imdbRating;
        const plot = json.Plot;
        const actors = json.Actors;
        const tomatoRating = json.tomatoRating;
        const tomatoURL = json.tomatoURL;

        console.log(`Title: ${title}\nYear: ${year}\nIMDB Rating: ${imdbRating}\nPlot: ${plot}\nActors: ${actors}\nTomato Rating: ${tomatoRating}\nTomato URL ${tomatoURL}`);
    });
};

const runCommandFile = () =>
{
    preventWrite = true;

    file.on('line', function(data)
    {
        let split = data.split(',');

        user_command = split[0];
        user_arguments  = split[1];
        user_extraarguments = split[2];

        runCommand(user_command);
    });
};

const logCommand = (user_command, user_arguments, user_extraarguments, callback) =>
{
    if (preventWrite === true)
        return;

    if (command == null || commandValue == null)
        return;

    if (command == 'do-what-it-says')
        throw new Error('Command will result in a loop');

    if (extraCommands !== '')
    {
        filesystem.appendFile(randomTextFile, `\n${command},${commandValue},${extraCommands}`, function(err)
        {
            if (err)
                throw err;
        });
    }
    else
    {
        filesystem.appendFile(randomTextFile, `\n${command},${commandValue}`, function(err)
        {
            if (err)
                throw err;
        });
    }

    if(callback)
        callback();
};

// Runs when the program is started.
main();
