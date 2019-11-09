const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')

async function robot(content) {
    await fetchContentFromWikipedia(content)
    sanitizeContent(content)
    breakContentIntoSentences(content)

    async function fetchContentFromWikipedia(content) {
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
        const wikipediaAlgorithmia = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2')
        const wikipediaResponde = await wikipediaAlgorithmia.pipe(content.searchTerm)
        const wikipediaContent = wikipediaResponde.get()

        content.sourceContentOriginal = wikipediaContent.content
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

    function breakContentIntoSentences(content){
        content.sentences = []

        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
        sentences.forEach((sentence)=>{
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }

}
module.exports = robot



