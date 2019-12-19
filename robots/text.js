const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu.json').apiKey

const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

const nlu = new NaturalLanguageUnderstandingV1({
    authenticator: new IamAuthenticator({ apikey: 'RjSxbQNpIYpCnVItqThqWk2J7qreqSRRqBnRLHtxP_cO' }),
    version: '2018-04-05',
    url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
});

const state = require('./state.js')

async function robot() {
    console.log('> [text-robot] Starting...')

    const content = state.load()

    await fetchContentFromWikipedia(content)
    sanitizeContent(content)
    breakContentIntoSentences(content)
    limitMaximumSentences(content)
    await fetchKeywordsOfAllSentences(content)

    state.save(content)

    async function fetchContentFromWikipedia(content) {
        console.log('> [text-robot] Fetching content from Wikipedia')
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
        const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2')
        const wikipediaResponse = await wikipediaAlgorithm.pipe({
            "lang": content.lang,
            "articleName": content.searchTerm
        })
        const wikipediaContent = wikipediaResponse.get()

        content.sourceContentOriginal = wikipediaContent.content
        console.log('> [text-robot] Fetching done!')
    }

    function sanitizeContent(content) {
        const withoutBlanckLinesAndMarkdown = removeBlanckLinesAndMarkdown(content.sourceContentOriginal)
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlanckLinesAndMarkdown)
        // console.log(withoutDatesInParentheses)

        content.sourceContentSanitized = withoutDatesInParentheses

        function removeBlanckLinesAndMarkdown(text) {
            const allLines = text.split('\n')
            const withoutBlanckLinesAndMarkdown = allLines.filter((line) => {
                if (line.trim().lingth === 0 || line.trim().startsWith('m')) {
                    return false
                }
                return true
            })
            return withoutBlanckLinesAndMarkdown.join('')
        }
    }

    function removeDatesInParentheses(text) {
        return text.replace(/\((?:\([^()]*\)|[^()])/gm, '').replace(/   /g, '')
    }

    function breakContentIntoSentences(content) {
        content.sentences = []

        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
        sentences.forEach((sentence) => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }

    function limitMaximumSentences(content){
        content.sentences = content.sentences.slice(0, content.maximumSentences)
    }

    async function fetchKeywordsOfAllSentences(content){
        console.log('> [text-robot] Starting to featch keywords from Watson')
        for (const sentence of content.sentences){
            console.log(`> [text-robot] Sentence: "${sentence.text}"`)
            sentence.keywords = await fetcWatsonAndReuturnKeywords(sentence.text)
            console.log(`> [text-robot] Keyword: ${sentence.keywords.join(', ')}\n`)
        }
    }

    async function fetcWatsonAndReuturnKeywords(sentence) {
        pro = new Promise((resolve, reject) => {
            nlu.analyze({
                text: sentence,
                features: {
                    keywords: {}
                }
            }, (error, response) => {
                if (error) {
                    reject(error)
                    return 
                }

                const keywords = response.result.keywords.map((keyword) => {
                     return keyword.text
                 })
                
                resolve(keywords)
            })
        })

        return pro
    }
}
module.exports = robot



