'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
var natural = require('natural');

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
        var response = await axios.request(weaponsUrl);
        var result = response.data
        
        var $ = cheerio.load(result);
        
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
        const weaponResponse = await axios.request(weaponUrl);
        const weaponResult = weaponResponse.data
        $ = cheerio.load(weaponResult)
        const weaponInformation = {
            
            name:fuzzyResults[0].weaponName,
            short_description:"",
            description:"",
            damage:{},
            item_set:{},
            demonstration:"",
            achievements:{},
            crafting:{},
            strange_variant:{},
            update_history:{},
            bugs:{},
            trivia:{},
            extra_attributes:{}

        }
        
        //$('li[class^="toclevel"]').each((index, element) => {
            //const content = $(element).text();
            //if(content.includes(""))
            //weaponInformation[content] = content;
        //});
        const pContent = [];
        $('#content p').each((index, element) => {
            const content = $(element).text();
            pContent.push(content);
        });
        pContent.shift()
        weaponInformation.short_description = pContent[0]
        weaponInformation.description = pContent[1]
        return weaponInformation

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