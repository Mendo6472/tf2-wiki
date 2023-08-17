'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
var natural = require('natural');
const weapon_lang = require('./src/lang/weapon_lang.json');

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
        var lang = "en"
        if(options.lang){
            const acceptedLangs = ["cs", "da", "de", "es", "fi", "fr", "hu", "it", "ja", "ko", "nl", "no", "pl", "pt", "pt-br", "ro", "ru", "sv", "tr", "zh-hans", "zh-hant"]
            if(options.lang != "en" && acceptedLangs.includes(options.lang)){
                lang = options.lang
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
            notes:{},
            trivia:"",
            extra_attributes:{}
            
        }
        $('span[class^="mw-headline"]').each((index, element) => {
            const content = $(element).text().toLowerCase();
            const nextElement = $(element).parent().next();
            // Check if the next element is <ul>, and it's not inside the <span>
            if(content == weapon_lang.notes[lang].toLowerCase()){
                if (nextElement.is('ul') && !nextElement.closest('span').length) {
                    const ulContent = nextElement.text().toString();
                    weaponInformation.notes = ulContent;
                }
            }else if(content == weapon_lang.trivia[lang].toLowerCase()){
                if (nextElement.is('ul') && !nextElement.closest('span').length) {
                    const ulContent = nextElement.text().toString();
                    weaponInformation.trivia = ulContent;
                }
            }
        });
        const trivia = weaponInformation.trivia.toString().split(/\r?\n/);
        weaponInformation.trivia = trivia;
        const notes = weaponInformation.notes.toString().split(/\r?\n/);
        weaponInformation.notes = notes

        if (trivia[0] === '[object Object]'){
            weaponInformation.trivia = []
        }

        if (notes[0] === '[object Object]'){
            weaponInformation.notes = []
        }

        const pContent = [];
        $('#content p').each((index, element) => {
            var content = $(element).text();
            content = content.slice(0, -1);
            pContent.push(content);
        });
        pContent.shift()
        weaponInformation.short_description = pContent[0]
        weaponInformation.description = pContent[1]
        let targetThElement = null;
        $('th').each((index, thElement) => {
            const anchorElement = $(thElement).find('a');
            const href = anchorElement.attr('href');
            if (href && href.startsWith('/wiki/Item_sets')) {
                targetThElement = thElement;
                return false;
            }
        });
        if (targetThElement) {
            const tdElements = [];
            let currentElement = $(targetThElement).next();
            
            while (currentElement.length && currentElement.is('td')) {
                tdElements.push(currentElement);
                currentElement = currentElement.next();
            }
            
            currentElement = $(targetThElement).parent().next('tr');
            var trContent
            if (currentElement.length > 0) {
                trContent = currentElement.find('td').map((index, tdElement) => $(tdElement).text().trim()).get();
            }
            
            var tdContent = tdElements.map(tdElement => $(tdElement).text().trim());
            tdContent = tdContent[0].split("\n")
            for(var i = 0; i < tdContent.length; i++){
                tdContent[i] = tdContent[i].trimStart();
            }
            weaponInformation.item_set.items = tdContent
            if(trContent) weaponInformation.item_set.effect = trContent
        }
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