'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
var natural = require('natural');
const qs = require('querystring');

class Client {
	constructor() {
		this.endpoint = 'https://wiki.teamfortress.com';
	}

    async search(options){
        if(!options){
            throw new Error("Expected search options")
        }
        if(options.type){
            switch (options.type){
                case "weapon" : return await this.searchWeapon(options)

                default:
                    throw new Error("A valid type of search must be provided")
            }
        } else {
            throw new Error("A valid type of search must be provided")
        }
    }

    async searchWeapon(options){
        if(!options){
            throw new Error("Expected search options")
        }
        if(!options.q){
            throw new Error("Expected search query")
        }
        var weaponsUrl = `${this.endpoint}/wiki/weapons`;
        const query = options.q
        if(options.lang){
            const acceptedLangs = ["cs", "da", "de", "es", "fi", "fr", "hu", "it", "ja", "ko", "nl", "no", "pl", "pt", "pt-br", "ro", "ru", "sv", "tr", "zh-hans", "zh-hant"]
            if(options.lang != "en" && acceptedLangs.includes(options.lang)){
                weaponsUrl += "/" + options.lang
            }
        }
        const response = await axios.request(weaponsUrl);
        const result = response.data
        
        const $ = cheerio.load(result);
        
        const weapons = [];
        
        $('a b').each((index, element) => {
            const $a = $(element).parent('a');
            const url = $a.attr('href');
            const weaponName = $(element).text();
            
            if (url) {
                weapons.push({
                    url,
                    weaponName,
                });
            }
        });
        const fuzzyResults = weaponFuzzySearchInJSON(weapons, query);
        if(!fuzzyResults[0]){
            return undefined;
        }
        const weaponUrl = this.endpoint + fuzzyResults[0].url
        return weaponUrl
    }
}

function weaponFuzzySearchInJSON(jsonData, searchQuery, threshold = 0.85) {          
    const searchResults = jsonData.filter((item) => {
        const similarity = natural.JaroWinklerDistance(item.weaponName.toLowerCase(), searchQuery.toLowerCase(), {ignoreCase: true});
        return similarity >= threshold;
    });
    if (searchResults && Array.isArray(searchResults)) {
        searchResults.sort((a, b) => {
            const similarityA = natural.JaroWinklerDistance(a.weaponName, searchQuery, {ignoreCase: true});
            const similarityB = natural.JaroWinklerDistance(b.weaponName, searchQuery, {ignoreCase: true});
            return similarityB - similarityA;
        });
    }
    return searchResults;
}

module.exports = {
    Client,
}