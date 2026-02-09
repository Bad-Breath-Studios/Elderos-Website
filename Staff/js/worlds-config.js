/* ============================================================
   ELDEROS STAFF PANEL - WORLDS CONFIG EDITOR
   Uses the shared ConfigEditor with CodeMirror.
   Agent tokens are masked by the backend.
   ============================================================ */
console.log('[WorldsConfig] Loading worlds-config.js...');

const WorldsConfig = {
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
        const container = document.getElementById('page-worlds-config');
        if (!container) return;

        this._editor = ConfigEditor.create(container, {
            configId: 'worlds-config',
            schemaId: 'worlds-config',
            warningText: 'Changes are hot-reloaded within 30 seconds. Agent tokens are masked for security.',
            loadFn: async () => {
                const data = await API.config.getWorldsConfig();
                return { yaml: data.yaml, fileHash: data.fileHash };
            },
            saveFn: async (yaml, basedOnHash) => {
                const result = await API.config.saveWorldsConfig(yaml, basedOnHash);
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
    module.exports = WorldsConfig;
}
