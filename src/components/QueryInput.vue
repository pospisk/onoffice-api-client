<script setup lang="ts">
import { callApi } from '@/api-client';
import { History } from '@/history';
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { Codemirror } from "vue-codemirror";
import { json } from "@codemirror/lang-json";

const savedToken = sessionStorage.getItem("token")
const savedSecret = sessionStorage.getItem("secret")

const token = ref(savedToken || "")
const secret = ref(savedSecret || "")

const rememberSession = import.meta.env.VITE_REMEMBER_SESSION as boolean | undefined || false
function updateSessionStorage(token: string, secret: secret) {
    if (rememberSession) {
        sessionStorage.setItem("token", token)
        sessionStorage.setItem("secret", secret)
        localStorage.setItem("rememberSession", "true")
    } else {
        sessionStorage.removeItem("token")
        sessionStorage.removeItem("secret")
        localStorage.removeItem("rememberSession")
    }
}

updateSessionStorage(token.value, secret.value)
watch([token, secret], ([newToken, newSecret]) => {
    updateSessionStorage(newToken, newSecret)
})

const extensions = [json()];

const history = reactive(new History());
const previousLabel = computed(() => {
    if (history.canGoBack()) {
        return `Previous (#${history.getCurrentNumber() - 1})`;
    } else {
        return "Previous";
    }
})
const nextLabel = computed(() => {
    if (history.canGoForward()) {
        return `Next (#${history.getCurrentNumber() + 1})`;
    } else {
        return "Next"
    }
})
function previousInHistoryClicked() {
    history.goBack()
    const historyEntry = history.getCurrentEntry()
    if (historyEntry !== null) {
        response.value = historyEntry.response
    }
}
function nextInHistoryClicked() {
    history.goForward()
    const historyEntry = history.getCurrentEntry()
    if (historyEntry !== null) {
        response.value = historyEntry.response
    }
}

const examples = reactive(new Map())
examples.set("Read Estates", `\
{
    "actionid": "urn:onoffice-de-ns:smart:2.5:smartml:action:read",
    "resourceid": "",
    "identifier": "",
    "resourcetype": "estate",
    "parameters": {
        "data":["Id", "lage", "kaufpreis"],
        "filter": {
            "status": [{"op": "=", "val": 1}],
            "kaufpreis": [{"op": "<", "val": 300000}]
        },
        "listlimit": 100,
        "listoffset": 0,
        "sortby": {"kaufpreis": "ASC", "warmmiete": "ASC"}
    }
}`)
examples.set("Create Estate", `\
{ 
    "actionid":"urn:onoffice-de-ns:smart:2.5:smartml:action:create",
    "resourceid":"",
    "identifier":"",
    "resourcetype":"estate",
    "parameters":{ 
        "data":{ 
            "objektart":"haus",
            "nutzungsart":"wohnen",
            "vermarktungsart":"kauf",
            "objekttyp":"einfamilienhaus",
            "plz":52068,
            "ort":"Aachen",
            "land":"DEU",
            "regionaler_zusatz":["openGeoDb_Region_122117"],
            "nebenkosten":100,
            "heizkosten":80,
            "mietpreis_pro_qm":12,
            "wohnflaeche":75,
            "anzahl_zimmer":3,
            "anzahl_schlafzimmer":1,
            "anzahl_badezimmer":1,
            "breitengrad":"50.7762106",
            "laengengrad":"6.0857545",
            "heizungsart":["zentral","fussboden"],
            "stellplatzart":["freiplatz","carport"],
            "kaufpreis":200000
        }
    }
}
`)

const currentExample = ref<string | null>("Read Estates")

const query = ref<string>(examples.get(currentExample.value))
const sending = ref(false)
const error = ref<string | null>(null)
const submitMsg = computed(() => {
    if (!sending.value) {
        return `Send #${history.size() + 1}`
    } else {
        return `Sending #${history.size() + 1}…`
    }
})

const response = ref("")

const codemirrorStyle = {
    width: "100%",
    "max-width": "100%",
    "margin-top": "0.5rem",
    "margin-bottom": "0.5rem",
}

async function sendQuery() {
    try {
        error.value = null
        sending.value = true
        response.value = await callApi(
            token.value,
            secret.value,
            query.value
        ).then(response => JSON.stringify(response, undefined, 2))

        history.addNewEntry({
            query: query.value,
            response: response.value
        })
    } catch (e: any) {
        error.value = `An error occurred while sending the query:\n${e.message}`
    } finally {
        sending.value = false
    }
}

function queryModified(newQuery: string) {
    query.value = newQuery
    currentExample.value = null
}

function exampleChanged() {
    if (currentExample.value !== null) {
        query.value = examples.get(currentExample.value)
    }
}
</script>

<template>
    <div class="input">
        <h2>New query</h2>
        <form @submit.prevent="sendQuery">
            <div class="credentials">
                <div class="inputs">
                    <label>
                        Token
                        <input type="text" required v-model="token" name="username" autocomplete="username" />
                    </label>
                    <label>
                        Secret
                        <input type="password" required v-model="secret" name="password" autocomplete="password" />
                    </label>
                </div>
            </div>
            <select v-model="currentExample" @change="exampleChanged">
                <option v-if="currentExample === null" selected :value="null">Custom</option>
                <option v-for="[key, _] in examples" :value="key" :selected="currentExample === key">{{ key }}</option>
            </select>
            <codemirror class="cm-editor" :style="codemirrorStyle" :extensions="extensions" :modelValue="query"
                @update:modelValue="queryModified" />
            <input type="hidden" :value="query" name="query" />
            <input type="submit" :value="submitMsg" :disabled="sending">
        </form>
        <div class="error" v-if="error !== null">
            <p v-for="paragraph in error.split('\n')">{{paragraph}}</p>
        </div>
        <template v-if="history.size() > 0">
            <h2>Response #{{history.getCurrentNumber()}}</h2>
            <div class="history" v-if="history.size() > 1">
                <button :disabled="!history.canGoBack()" @click="previousInHistoryClicked">{{ previousLabel }}</button>
                <button :disabled="!history.canGoForward()" @click="nextInHistoryClicked">{{ nextLabel }}</button>
            </div>
            <details>
                <summary>See query #{{history.getCurrentNumber()}}</summary>
                <codemirror class="output" :style="codemirrorStyle" :extensions="extensions"
                    :modelValue="history.getCurrentEntry()?.query" readonly />
            </details>
            <codemirror class="output" :style="codemirrorStyle" :extensions="extensions"
                :modelValue="history.getCurrentEntry()?.response" readonly />
        </template>
    </div>
</template>

<style scoped>
.input {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

form {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
}

.credentials {
    display: flex;
    flex-direction: column;
    margin-bottom: 1.5rem;
    gap: 0.5rem;
}

.credentials .inputs {
    display: flex;
    flex-direction: row;
    gap: 1rem;
}

.credentials .remember {
    flex-direction: row;
}


label {
    display: flex;
    flex-direction: column;
}

.error {
    border: 0.1rem solid red;
    padding: 0 1rem;
    margin: 1rem 0;
}

.history {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 0.5rem;
}

details {
    width: 100%;
    margin-bottom: 1rem;
}

.output {
    width: 100%;
    resize: none;
}
</style>