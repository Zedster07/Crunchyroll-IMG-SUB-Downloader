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


const getFullyAvailableSubs = async (episodes, sq,season) => {
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
        console.log(`No available subtitles found for ${season.title}`);
        return;
    }
    
    console.log("Subtitles found: \n");
    console.log(list.join('\n'));
    console.log("\n");
    const subSelected = readlineSync.question(`Select a subtitle [1-${intersectionArray.length}]: `);
    
    console.log("\n");
    const idx = parseInt(subSelected);
    if(idx >= 1 && idx <= intersectionArray.length) {
        fs.mkdir(`downloads/${sq.title}/${season.title}/subs/${intersectionArray[idx - 1]}`, { recursive: true }, () => {});
        process.stdout.write('\x1Bc');
        console.log('Downloading subtitles... ')
        for (let index = 0; index < episodes.length; index++) {
            const element = episodes[index];
            const sub = element.streams[intersectionArray[idx - 1]];
            if(element.episodeNumber) {
                const fileName = `${element.serieTitle}-S${element.seasonNumber}-E${element.episodeNumber}.${sub.format}`;
                try {
                    await downloadFile(sub.url,  `downloads/${sq.title}/${season.title}/subs/${intersectionArray[idx - 1]}/${fileName}`);
                    console.log(`${fileName} downloaded successfully`)
                } catch (error) {
                    console.error(`Error downloading file: ${fileName}`)
                }
            }
            
        }
    }
}

const parseInput = (input , seasonsData) => {

    let selectedSeasons = [];
    if(input.trim() == "" || input == "all") {
        console.log("Selecting all seasons...");
        selectedSeasons = seasonsData.map((item , index) => index+1)
        return selectedSeasons;
    }

    const parts = input.split(/[, -]/);
    
    if (input.includes('-')) {
        // Range of seasons
        const [start, end] = parts.map(s => parseInt(s.trim()));
        if(end > seasonsData.length) {
            return false;
        }
        for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= seasonsData.length) {
                selectedSeasons.push(i);
            }
        }
    } else if(input.includes(',')){
        selectedSeasons = parts.map(item => parseInt(item));
    } else {
        const season = parseInt(input.trim());
        if (season >= 1 && season <= seasonsData.length) {
            selectedSeasons.push(season);
        } else {
            return false;
        }
    }

    return selectedSeasons;
}

const getSubs = async (firstResult, max) => {
    if(firstResult) {
        fs.mkdir(`downloads/${firstResult.title}/subs`, { recursive: true }, () => {});
        const anime = await cr.getAnime(firstResult.id);
        const { items: seasons } = await cr.getSeasons(anime.id);
        const anime_seasons = seasons.filter(item => item.is_subbed);   
        const anime_seasons_list = anime_seasons.map((item , index) => `[${index+1}] - ${item.title}`);
        console.log("Seasons found: \n");
        console.log(anime_seasons_list.join('\n'));
        console.log("\n");
        const seasons_tod = readlineSync.question(`Choose a seasons (list: 1,2,3.. or range:1-5 or one: 1): `);
        const selected_seasons = parseInput(seasons_tod, anime_seasons);

        if(!selected_seasons){
            console.log("Failed!, wrong values");
            return;
        }
       
        for (let i in selected_seasons) {
        
            const dat = selected_seasons[i];
            const eps = await cr.getEpisodes(anime_seasons[dat-1].id); 
            
            const episodes = eps.items.filter(item => item.episode_number != null).sort((a,b) => a.episode_number - b.episode_number)
            .map(item => ({seasonNumber:item.season_number, episodeNumber:item.episode_number, serieTitle:item.series_title,...item?.versions?.find(it => it.audio_locale == "ja-JP")}));
            const maxEps = parseInt(max) < episodes.length ? parseInt(max) : episodes.length;
            const userInput = readlineSync.question(`You are about to download ${maxEps} subtitle files for ${anime_seasons[dat-1].title}, proceed? y/n: `); 
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
                await getFullyAvailableSubs(epsStreams, firstResult, anime_seasons[dat-1]);
            }
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
        console.log("Please enter credentials (-e <email> -p <password>)")
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
    const animeSelected = readlineSync.question(`Select an anime (list: 1,2,3.. or range:1-5 or one: 1): `);
    const selected = parseInput(animeSelected, list);
    console.log("\n");
    for(let s of selected) {
        const idx = parseInt(s);
        if(idx >= 1 && idx <= topResults.items.length) {
            firstResult = topResults.items[idx-1];
            process.stdout.write('\x1Bc');
            console.log(`Working on ${firstResult.title}:`)

            if(exType == "images") {
                await getImages(firstResult)
            } else if(exType == "subs"){
                await getSubs(firstResult , max);
            } else {
                await getImages(firstResult)
                await getSubs(firstResult , max);
            }
        } else {
            console.log("Failed !, please select a correct number");
        }
    }
    

})();
