# Crunchy-IMG/SUB-Downloader

Crunchy-IMG/SUB-Downloader is a command-line tool for downloading anime images and subtitles.

## Installation

Clone the repository:

git clone https://github.com/Zedster07/Crunchy-IMG-SUB-Downloader.git

Install dependencies:

```npm install```

## Usage

Run the script with Node.js:

```npm start -- [options]```

Options:

- -s, --search <query>: Specify the search query for anime.
- -t, --type <type>: Specify the extraction type. Valid values: 'images', 'subs'.
- -e, --email <email>: Specify your email address for login.
- -p, --password <password>: Specify your password for login.
- -m, --max <max>: Specify the maximum number of episodes to download subtitles for (optional, default is all episodes).
- -h, --help: Display help message.

## Examples

Search for anime and download images:

node anime-downloader.js -s "Attack on Titan" -t images

Download subtitles for anime episodes:

node anime-downloader.js -s "Naruto" -t subs -e your@email.com -p yourpassword

## License

This project is licensed under the MIT License - see the LICENSE file for details.
