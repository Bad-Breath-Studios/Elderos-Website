/* ============================================================
   ELDEROS STAFF PANEL - HUB CONFIG EDITOR
   Uses the shared ConfigEditor with CodeMirror.
   Sensitive fields are masked by the backend.
   ============================================================ */
console.log('[HubConfig] Loading hub-config.js...');

const HubConfig = {
    _editor: null,

    init() {
        // Nothing to cache on init
    },

    onPageLoad() {
        this.load();
    },

    onPageLeave() {
        if (this._editor) {
            this._editor.destroy();
            this._editor = null;
        }
    },

    async load() {
        const container = document.getElementById('page-hub-config');
        if (!container) return;

        this._editor = ConfigEditor.create(container, {
            configId: 'hub-config',
            schemaId: 'hub-config',
            warningText: 'Some changes may require a Hub restart to take effect. Sensitive fields are masked.',
            loadFn: async () => {
                const data = await API.config.getHubConfig();
                return { yaml: data.yaml, fileHash: data.fileHash };
            },
            saveFn: async (yaml, basedOnHash) => {
                const result = await API.config.saveHubConfig(yaml, basedOnHash);
                return { message: result.message, fileHash: result.fileHash };
            },
            onDirtyChange: (isDirty) => {
                // Could hook into global dirty state tracking here
            }
        });

        await this._editor.load();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HubConfig;
}
