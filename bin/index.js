#!/usr/bin/env node
const cr = require('./main.js');
const fs = require('fs');
const axios = require('axios');
const readlineSync = require('readline-sync');
const ProgressBar = require('progress');


const downloadFile = async (url, filePath) => {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};


const getImages = async (firstResult) => {
    


    fs.mkdir(`downloads/${firstResult.title}`, { recursive: true }, (err) => {});
    
    fs.mkdir(`downloads/${firstResult.title}/poster`, { recursive: true }, (err) => {});
    
    fs.mkdir(`downloads/${firstResult.title}/wallpaper`, { recursive: true }, (err) => {});

    console.log("Downloading images ...");
    
    const images = firstResult.images;
    const posters_tal = images.poster_tall[0].filter(item => item.height == 720).map(item => item.source);
    const pictureurl = posters_tal[0]
    const filename = pictureurl.split('/')[pictureurl.split('/').length - 1];
    try {
        await downloadFile(pictureurl,  `downloads/${firstResult.title}/poster/${filename}`); 
        console.log(`FIle downloaded ${`downloads/${firstResult.title}/poster/${filename}`}`)   
    } catch (error) {
        console.log("Download failed!");
    }
    

    const posters_wide = images.poster_wide[0].filter(item => item.height == 1080).map(item => item.source);
    const pictureurl_wide = posters_wide[0]
    const filename_wide = pictureurl_wide.split('/')[pictureurl_wide.split('/').length - 1];

    try {
        await downloadFile(pictureurl_wide,  `downloads/${firstResult.title}/wallpaper/${filename_wide}`);
        console.log(`FIle downloaded ${`downloads/${firstResult.title}/wallpaper/${filename_wide}`}`)   
    } catch (error) {
        console.log("download failed");
    }
    

}


const getFullyAvailableSubs = async (episodes, sq) => {
    const keys = episodes.map(item => Object.keys(item.streams));
    let intersection = new Set(keys[0]);

    for (let i = 1; i < keys.length; i++) {
    const currentArray = keys[i];
        intersection = new Set(currentArray.filter(item => intersection.has(item)));
    }

    const intersectionArray = Array.from(intersection);
    const list = intersectionArray.map((item , index) => `[${index+1}] - ${item}`);
    process.stdout.write('\x1Bc');
    if(list.length == 0) {
        console.log(`No available subtitles found for ${firstResult.title}`);
        return;
    }
    console.log("Subtitles found: \n");
    console.log(list.join('\n'));
    console.log("\n");
    const subSelected = readlineSync.question(`Select a subtitle [1-${intersectionArray.length}]: `);
    
    console.log("\n");
    const idx = parseInt(subSelected);
    if(idx >= 1 && idx <= intersectionArray.length) {
        fs.mkdir(`downloads/${sq.title}/subs/${intersectionArray[idx - 1]}`, { recursive: true }, () => {});
        process.stdout.write('\x1Bc');
        console.log('Downloading subtitles... ')
        for (let index = 0; index < episodes.length; index++) {
            const element = episodes[index];
            const sub = element.streams[intersectionArray[idx - 1]];
            if(element.episodeNumber) {
                const fileName = `${element.serieTitle}-S${element.seasonNumber}-E${element.episodeNumber}.${sub.format}`;
                try {
                    await downloadFile(sub.url,  `downloads/${sq.title}/subs/${intersectionArray[idx - 1]}/${fileName}`);
                    console.log(`${fileName} downloaded successfully`)
                } catch (error) {
                    console.error(`Error downloading file: ${fileName}`)
                }
            }
            
        }
    }
}

const getSubs = async (firstResult, max) => {
    if(firstResult) {
        fs.mkdir(`downloads/${firstResult.title}/subs`, { recursive: true }, () => {});
        const anime = await cr.getAnime(firstResult.id);
        const { items: seasons } = await cr.getSeasons(anime.id);
        const anime_seasons = seasons.filter(item => item.is_subbed);
        const eps = await cr.getEpisodes(anime_seasons[0].id); 
        const episodes = eps.items.filter(item => item.episode_number != null).sort((a,b) => a.episode_number - b.episode_number)
        .map(item => ({seasonNumber:item.season_number, episodeNumber:item.episode_number, serieTitle:item.series_title,...item?.versions?.find(it => it.audio_locale == "ja-JP")}));
        const maxEps = parseInt(max) < episodes.length ? parseInt(max) : episodes.length;
        const userInput = readlineSync.question(`You are about to download ${maxEps} subtitle files, proceed? y/n: ` ); 
        console.log("\n");
        process.stdout.write('\x1Bc');
        if(userInput == 'y' || userInput == "Y" || userInput == "") {
            let epsStreams = [];
            const bar = new ProgressBar('Fetching episodes [:bar] :percent', { total:maxEps });
            for (let index = 0; index < maxEps; index++) {
                
                const element = episodes[index];
                const streams = await cr.getStreams2(element.media_guid);
                if(streams?.meta?.subtitles) {
                    epsStreams.push({episodeNumber: element.episodeNumber, serieTitle:element.serieTitle, seasonNumber:element.seasonNumber ,streams:streams?.meta?.subtitles});
                }
                bar.tick()
            }
            process.stdout.write('\x1Bc');
            console.log("Fetching subtitles...");
            getFullyAvailableSubs(epsStreams, firstResult);
        }
    } else {
        console.log("Something wrong happend!")
    }
}

const displayHelp = () => {
    console.log("Usage: ");
    console.log("  -s <search_query>  : Specify the search query for anime.");
    console.log("  -t <type>          : Specify the extraction type. Valid values: 'images', 'subs'.");
    console.log("  -e <email>         : Specify your email address for login.");
    console.log("  -p <password>      : Specify your password for login.");
    console.log("  -m <max>           : Specify the maximum number of episodes to download subtitles for (optional, default is all episodes).");
    console.log("  -h, --help         : Display this help message.");
    process.exit(0);
};

(async () => {
    
    const argv = process.argv.slice(2);
    let sq = "";
    let email = "";
    let password = "";
    let exType = ""
    let max = 999999999;

    for (let index = 0; index < argv.length; index++) {
        const match = argv[index].match(/^--?(\w+)$/);
        if (match) {
            const option = match[1];
            const value = argv[index + 1];
            switch (option) {
                case "s":
                case "search":
                    sq = value;
                    break;
                case "t":
                case "type":
                    exType = value;
                    break;
                case "e":
                case "email":
                    email = value;
                    break;
                case "p":
                case "password":
                    password = value;
                    break;
                case "m":
                case "max":
                    max = value;
                    break;
                default:
                    break;
            }
        }
    }

    if (argv.includes("-h") || argv.includes("--help")) {
        displayHelp();
    }

    if(email == "" || password == "") {
        console.log("Please enter credentials (-e <email> -p <password> )")
    }

    await cr.login(email, password);
    process.stdout.write('\x1Bc');
    const result = await cr.search(sq);
    const topResults = result.items.find(item => item.type=="top_results");

    fs.mkdir(`downloads`, { recursive: true }, (err) => {});


    process.stdout.write('\x1Bc');
    const list = topResults.items.map((item , index) => `[${index+1}] - ${item.title}`);
    console.log("Animes found: \n");
    console.log(list.join('\n'));
    console.log("\n");
    const animeSelected = readlineSync.question(`Select an anime [1-${topResults.items.length}]: `);
    console.log("\n");
    const idx = parseInt(animeSelected);
    if(idx >= 1 && idx <= topResults.items.length) {
        firstResult = topResults.items[idx-1];
        if(exType == "images") {
            getImages(firstResult)
        } else if(exType == "subs"){
            getSubs(firstResult , max);
        } else {
            await getImages(firstResult)
            await getSubs(firstResult , max);
        }
    } else {
        console.log("Failed !, please select a correct number");
    }

})();
