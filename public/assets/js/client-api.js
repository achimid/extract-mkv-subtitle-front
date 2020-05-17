const SERVER_URL = 'http://extractmkvsubtitle.ddns.net'
// const SERVER_URL = 'http://localhost:9001'


const $dlwSpeed = document.querySelector("#dlw-speed")
const $uplSpeed = document.querySelector("#upl-speed")
const $magnetLink = document.querySelector("#magnetLink")
const $form = document.querySelector('#extract-form')
const $status = document.querySelector('#status')
const $result = document.querySelector('#result')
const $useCache = document.querySelector('#useCache')
const $langTo = document.querySelector('#langTo')

const socket = io(SERVER_URL, { transports: ['websocket'] })
socket.on('reconnect_attempt', () => { socket.io.opts.transports = ['polling', 'xhr-polling', 'websocket'] })

const showForm = () => $form.classList.remove('hidden')
const hideForm = () => $form.classList.add('hidden')

const showStatus = () => $status.classList.remove('hidden')
const hideStatus = () => $status.classList.add('hidden')


function sendExtraction() {
    const body = {
        magnetLink: $magnetLink.value, 
        ignoreCache: (!$useCache.checked).toString(),
        langsTo: [$langTo.value]
    }
    
    fetch(SERVER_URL + '/api/v1/extract', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })
        .then(res => res.json())
        .then(onResponseExtraction)
}

const onResponseExtraction = (extraction) => {
    if (extraction == null) return
    
    const EXTRACTION_ID = extraction._id


    socket.on(`${EXTRACTION_ID}_DOWNLOADING`, ({extra}) => {
        const $progressBar = new ldBar("#progress-bar")
        $progressBar.set(extra.progress, false)
        $dlwSpeed.innerHTML = extra.downloadSpeed
        $uplSpeed.innerHTML = extra.uploadSpeed    
    })

    socket.on(`${EXTRACTION_ID}_DONE`, ({body}) => {
        console.info('Evento de DONE', body)
        hideStatus()
        createSubtitlesDownload(body)
        console.info('Evento de DONE concluido')
    })

    socket.on(`${EXTRACTION_ID}_FINISHED`, (data) => {
        console.info('Evento de FINISHED', data)
        hideStatus()
        console.info('Evento de FINISHED concluido')
    })

    if(notHasSubtitles(extraction)) {
        showStatus()
    } else {
        createSubtitlesDownload(extraction)
        hideStatus()
    }
}


const createSubtitlesDownload = (extraction) => {
    if (notHasSubtitles(extraction)) return

    extraction.subtitles.map(({fileName, fileContent, translations}) => {
        createDownloadButton(fileName, fileContent)
        translations.map(({content, to}) => createDownloadButton(fileName.replace('.srt', `.${to}.srt`), content))        
    })
}

const createDownloadButton = (filename, text) => {
    
    const template = `
        <div class="row">
            <a href="data:text/plain;charset=utf-8,{{text}}" download="{{filename}}">
                <button class="btn"><i class="fa fa-download"></i> Download</button>
            </a>
            <p class="col-ml">{{filename}}</p>
        </div>
    `.replace('{{text}}', encodeURIComponent(text)).replace('{{filename}}', filename).replace('{{filename}}', filename)

    $result.innerHTML = $result.innerHTML + template
        
  }

  const notHasSubtitles = (extraction) => (!extraction || !extraction.subtitles || extraction.subtitles.length == 0 )