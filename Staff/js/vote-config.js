/* ============================================================
   ELDEROS STAFF PANEL - VOTE CONFIG EDITOR
   Uses the shared ConfigEditor with CodeMirror.
   Callback secrets are masked by the backend.
   ============================================================ */
console.log('[VoteConfig] Loading vote-config.js...');

const VoteConfigEditor = {
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
        const container = document.getElementById('page-vote-config');
        if (!container) return;

        // Dev+ check
        const user = Auth.getUser();
        if (!user || (user.role !== 'DEVELOPER' && user.role !== 'OWNER')) {
            Router.navigate('dashboard');
            return;
        }

        this._editor = ConfigEditor.create(container, {
            configId: 'vote-config',
            warningText: 'Changes take effect within 30 seconds. Callback secrets are masked.',
            loadFn: async () => {
                const data = await API.config.getVoteConfig();
                return { yaml: data.yaml, fileHash: data.fileHash };
            },
            saveFn: async (yaml, basedOnHash) => {
                const result = await API.config.saveVoteConfig(yaml, basedOnHash);
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
    module.exports = VoteConfigEditor;
}
