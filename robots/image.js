const imageDownloader = require('image-downloader')
const google = require('googleapis').google
const customSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')

async function robot() {
    const content = state.load()

    await downloadAllImages(content)
    await fecthImagesOfAllSentences(content)

    state.save(content)

    async function fecthImagesOfAllSentences(content) {
        for (const sentence of content.sentences) {
            const query = `${content.searchTerm} ${sentence.keywords[0]}`
            sentence.images = await fetchGoogleAndReturnImagesLinks(query)

            sentence.googleSearchQuery = query
        }
    }

    async function fetchGoogleAndReturnImagesLinks(query) {
        const response = await customSearch.cse.list({
            auth: googleSearchCredentials.apiKey,
            cx: googleSearchCredentials.searchEngineId,
            q: query,
            searchType: 'image',
            num: 2
        })

        const imagesUrl = response.data.items.map((item) => {
            return item.link
        })

        return imagesUrl

    }

    async function downloadAllImages(content) {
        content.downloadImage = []

        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            const images = content.sentences[sentenceIndex].images

            for (let imagesIndex = 0; imagesIndex < images.length; imagesIndex++) {
                const imageUrl = images[imagesIndex]

                try {
                    if (content.downloadImage.includes(imageUrl)) {
                        throw new Error('Imagem já foi baixada')
                    }

                    await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`)
                    content.downloadImage.push(imageUrl)
                    console.log(`> [${sentenceIndex}][${imagesIndex}] Baixou a imagem com sucesso: ${imageUrl}`)
                    break
                } catch (error) {
                    console.log(`> [${sentenceIndex}][${imagesIndex}] Erro ao baixar ${imageUrl}: ${error}`)
                }
            }
        }
    }

    async function downloadAndSave(url, fileName) {
        return imageDownloader.image({
            url, url,
            dest: `./content/${fileName}`
        })
    }

    
    

}
module.exports = robot