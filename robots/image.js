const imageDownloader = require('image-downloader')
const gm = require('gm').subClass({ imageMagick: true })
const google = require('googleapis').google
const customSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')

async function robot() {
    const content = state.load()

    await downloadAllImages(content)
    await fecthImagesOfAllSentences(content)
    await convertAllImages(content)
    await createAllSentencesImage(content)
    await createYouTubeThumbnail()

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

    async function convertAllImages(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await convertImages(sentenceIndex)
        }
    }

    async function convertImages(sentenceIndex) {
        return new Promise((resolve, reject) => {
            const inputFile = `./content/${sentenceIndex}-original.png[0]`
            const outputFile = `./content/${sentenceIndex}-converted.png`
            const width = 1920
            const height = 1080
           
            gm()
                .in(inputFile)
                .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-blur', '0x9')
                .out('-resize', `${width}x${height}^`)
                .out(')')
                .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-resize', `${width}x${height}`)
                .out(')')
                .out('-delete', '0')
                .out('-gravity', 'center')
                .out('-compose', 'over')
                .out('-composite')
                .out('-extent', `${width}x${height}`)
                .write(outputFile, (error) => {
                    if (error) {
                        return reject(error)
                    }
                    console.log(`> Image converted:${inputFile}`)
                    resolve()
                })
        })
    }

    async function createAllSentencesImage(content){
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text)
        }
    }

    async function createSentenceImage(sentenceIndex, sentenceText){
        return new Promise((resolve, reject)=> {
            const outputFile = `./content/${sentenceIndex}-sentence.png`

            const templateSetting = {
                0: {
                    size:'1920x400',
                    gravity: 'center'
                },
                1: {
                    size:'1920x1080',
                    gravity: 'center'
                },
                2: {
                    size:'800x1080',
                    gravity: 'west'
                },
                3: {
                    size:'1920x400',
                    gravity: 'center'
                },
                4: {
                    size:'1920x1080',
                    gravity: 'center'
                },
                5: {
                    size:'800x1080',
                    gravity: 'west'
                },
                6: {
                    size:'1920x400',
                    gravity: 'center'
                }
            }
            gm()
            .out('-size', templateSetting[sentenceIndex].size)
            .out('-gravity', templateSetting[sentenceIndex].gravity)
            .out('-background', 'transparent')
            .out('-fill', 'white')
            .out('-kerning','-1')
            .out(`caption:${sentenceText}`)
            .write(outputFile, (error)=>{
                if(error){
                    return reject(error)
                }
                console.log(`> Sentence crated: ${outputFile}`)
                resolve()
            })
        })
    }

    async function createYouTubeThumbnail(){
        return new Promise((resolve, reject)=>{
            gm()
            .in('./content/0-converted.png')
            .write('./content/youyube-thumbnail.jpg', (error) => {
                if(error){
                    return reject(error)
                }

                console.log('> Criando YouTube thumbnail.')
                resolve()
            })
        })
    }

}
module.exports = robot