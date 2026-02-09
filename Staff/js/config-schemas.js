/* ============================================================
   ELDEROS STAFF PANEL - CONFIG VALIDATION SCHEMAS
   ============================================================ */
console.log('[ConfigSchemas] Loading config-schemas.js...');

const ConfigSchemas = {
    'store-config': {
        fields: {
            version: { type: 'number', required: true },
            limited_event: {
                type: 'object', required: true,
                fields: {
                    id: { type: 'string', required: true, pattern: /^[a-z0-9-]+$/, patternHint: 'lowercase letters, numbers, and hyphens' },
                    name: { type: 'string', required: true, maxLength: 50 },
                    description: { type: 'string', required: true, maxLength: 200 },
                    startTime: { type: 'string', required: true, format: 'iso8601' },
                    endTime: { type: 'string', required: true, format: 'iso8601' },
                    theme: {
                        type: 'object', required: true,
                        fields: {
                            icon: { type: 'string', required: true },
                            accentColor: { type: 'string', required: true, format: 'hex-color' }
                        }
                    },
                    urgency: {
                        type: 'object', required: true,
                        fields: {
                            enabled: { type: 'boolean', required: true },
                            thresholdHours: { type: 'number', required: true, min: 1, max: 168 },
                            message: { type: 'string', required: true }
                        }
                    },
                    products: { type: 'array', required: true, items: { type: 'string' } }
                }
            },
            banners: {
                type: 'array', required: true,
                items: {
                    type: 'object',
                    fields: {
                        id: { type: 'string', required: true, pattern: /^[a-z0-9-]+$/, patternHint: 'lowercase letters, numbers, and hyphens' },
                        title: { type: 'string', required: true },
                        description: { type: 'string', required: true },
                        image: { type: 'string', required: true },
                        discountPercent: { type: 'number', required: true, min: 0, max: 100 },
                        ctaText: { type: 'string', required: true },
                        ctaAction: { type: 'string', required: true }
                    }
                }
            },
            products: {
                type: 'array', required: true,
                items: {
                    type: 'object',
                    fields: {
                        id: { type: 'string', required: true, pattern: /^[a-z0-9-]+$/, patternHint: 'lowercase letters, numbers, and hyphens' },
                        name: { type: 'string', required: true },
                        description: { type: 'string', required: true },
                        image: { type: 'string', required: true },
                        price: { type: 'number', required: true, min: 0 },
                        category: { type: 'string', required: true, enum: ['mystery-boxes', 'cosmetics', 'untradeables', 'consumables', 'utilities'] },
                        featured: { type: 'boolean', required: true },
                        discountPercent: { type: 'number', required: true, min: 0, max: 100 },
                        productColor: { type: 'string', required: true, format: 'hex-color' },
                        badge: { type: 'string', enum: ['', 'HOT', 'NEW', 'SALE', 'BEST', 'LIMITED'] },
                        bonusAmount: { type: 'number', required: true, min: 0 },
                        worlds: { type: 'array', required: true, items: { type: 'string' } },
                        imageFull: { type: 'string' },
                        limited: {
                            type: 'object', required: false,
                            fields: {
                                totalStock: { type: 'number', required: true, min: 1 },
                                maxPerPerson: { type: 'number', required: true, min: 0 },
                                eventId: { type: 'string', required: true },
                                eventName: { type: 'string', required: true },
                                eventStart: { type: 'string', required: true, format: 'iso8601' },
                                eventEnd: { type: 'string', required: true, format: 'iso8601' }
                            }
                        }
                    }
                }
            }
        },
        crossFieldRules: [
            // endTime must be after startTime
            function(parsed) {
                if (!parsed || !parsed.limited_event) return null;
                const ev = parsed.limited_event;
                if (ev.startTime && ev.endTime) {
                    const start = new Date(ev.startTime);
                    const end = new Date(ev.endTime);
                    if (!isNaN(start) && !isNaN(end) && end <= start) {
                        return { severity: 'error', path: 'limited_event.endTime', message: 'Event end time must be after start time' };
                    }
                }
                return null;
            },
            // Event products must reference existing product IDs
            function(parsed) {
                if (!parsed || !parsed.limited_event || !parsed.products) return null;
                const productIds = new Set((parsed.products || []).map(p => p.id).filter(Boolean));
                const eventProducts = parsed.limited_event.products || [];
                const missing = eventProducts.filter(id => !productIds.has(id));
                if (missing.length > 0) {
                    return { severity: 'error', path: 'limited_event.products', message: `Event references non-existent product(s): ${missing.join(', ')}` };
                }
                return null;
            },
            // No duplicate product IDs
            function(parsed) {
                if (!parsed || !parsed.products) return null;
                const seen = new Set();
                for (const p of parsed.products) {
                    if (p.id && seen.has(p.id)) {
                        return { severity: 'error', path: 'products', message: `Duplicate product ID: "${p.id}"` };
                    }
                    if (p.id) seen.add(p.id);
                }
                return null;
            },
            // No duplicate banner IDs
            function(parsed) {
                if (!parsed || !parsed.banners) return null;
                const seen = new Set();
                for (const b of parsed.banners) {
                    if (b.id && seen.has(b.id)) {
                        return { severity: 'error', path: 'banners', message: `Duplicate banner ID: "${b.id}"` };
                    }
                    if (b.id) seen.add(b.id);
                }
                return null;
            },
            // Products with discount should have SALE badge (warning)
            function(parsed) {
                if (!parsed || !parsed.products) return null;
                for (const p of parsed.products) {
                    if (p.discountPercent > 0 && p.badge !== 'SALE' && p.badge !== 'LIMITED') {
                        return { severity: 'warning', path: `products[${p.id}].badge`, message: `Product "${p.id}" has ${p.discountPercent}% discount but badge is "${p.badge || 'empty'}" — consider "SALE"` };
                    }
                }
                return null;
            },
            // Limited products should have LIMITED badge (warning)
            function(parsed) {
                if (!parsed || !parsed.products) return null;
                for (const p of parsed.products) {
                    if (p.limited && p.badge !== 'LIMITED') {
                        return { severity: 'warning', path: `products[${p.id}].badge`, message: `Product "${p.id}" has limited config but badge is "${p.badge || 'empty'}" — consider "LIMITED"` };
                    }
                }
                return null;
            },
            // Limited eventEnd must be after eventStart
            function(parsed) {
                if (!parsed || !parsed.products) return null;
                for (const p of parsed.products) {
                    if (p.limited && p.limited.eventStart && p.limited.eventEnd) {
                        const start = new Date(p.limited.eventStart);
                        const end = new Date(p.limited.eventEnd);
                        if (!isNaN(start) && !isNaN(end) && end <= start) {
                            return { severity: 'error', path: `products[${p.id}].limited.eventEnd`, message: `Product "${p.id}" limited event end must be after start` };
                        }
                    }
                }
                return null;
            }
        ]
    },

    'hub-config': {
        // Hub config is free-form YAML with sensitive fields
        // Only basic structure validation
        fields: {},
        crossFieldRules: [],
        sensitive: true
    },

    'worlds-config': {
        fields: {
            worlds: {
                type: 'array', required: true,
                items: {
                    type: 'object',
                    fields: {
                        id: { type: 'number', required: true, min: 1 },
                        agent_id: { type: 'string', required: true, pattern: /^[A-Z0-9_]+$/, patternHint: 'uppercase letters, numbers, underscores (e.g. AGENT_1)' },
                        host: { type: 'string', required: true },
                        game_port: { type: 'number', required: true, min: 1, max: 65535 },
                        agent_port: { type: 'number', required: true, min: 1, max: 65535 },
                        agent_token: { type: 'string', required: true },
                        ws_port: { type: 'number', required: true, min: 1, max: 65535 },
                        type: { type: 'string', required: true, enum: ['ECONOMY', 'PVP', 'LEAGUE', 'CUSTOM'] },
                        region: { type: 'string', required: true, enum: ['CAN', 'US', 'NTL'] },
                        name: { type: 'string' },
                        address: { type: 'string' },
                    }
                }
            }
        },
        crossFieldRules: [
            (parsed) => {
                if (!parsed || !parsed.worlds || !Array.isArray(parsed.worlds)) return null;
                const ids = parsed.worlds.map(w => w.id);
                const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
                if (dupes.length > 0) {
                    return { severity: 'error', path: 'worlds', message: `Duplicate world IDs: ${[...new Set(dupes)].join(', ')}` };
                }
                return null;
            },
            (parsed) => {
                if (!parsed || !parsed.worlds || !Array.isArray(parsed.worlds)) return null;
                const agentIds = parsed.worlds.map(w => w.agent_id).filter(Boolean);
                const dupes = agentIds.filter((id, i) => agentIds.indexOf(id) !== i);
                if (dupes.length > 0) {
                    return { severity: 'error', path: 'worlds', message: `Duplicate agent_ids: ${[...new Set(dupes)].join(', ')}` };
                }
                return null;
            },
        ],
        sensitive: true
    },

    /**
     * Validate a parsed object against a schema's fields definition.
     * @param {object} obj - the parsed YAML object
     * @param {object} fields - the schema fields definition
     * @param {string} path - current path prefix for error messages
     * @returns {Array} array of {severity, path, message}
     */
    validateFields(obj, fields, path) {
        const errors = [];
        if (!fields || !obj) return errors;

        for (const [key, def] of Object.entries(fields)) {
            const fullPath = path ? `${path}.${key}` : key;
            const value = obj[key];

            // Check required
            if (def.required && (value === undefined || value === null)) {
                errors.push({ severity: 'error', path: fullPath, message: `Required field "${fullPath}" is missing` });
                continue;
            }

            if (value === undefined || value === null) continue;

            // Type checks
            if (def.type === 'string') {
                if (typeof value !== 'string') {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be a string, got ${typeof value}` });
                    continue;
                }
                if (def.maxLength && value.length > def.maxLength) {
                    errors.push({ severity: 'warning', path: fullPath, message: `"${fullPath}" exceeds max length ${def.maxLength} (${value.length} chars)` });
                }
                if (def.pattern && !def.pattern.test(value)) {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" has invalid format — must be ${def.patternHint || 'matching pattern'}` });
                }
                if (def.format === 'hex-color' && !/^#[0-9a-fA-F]{3,8}$/.test(value)) {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be a valid hex color (e.g. #FF0000)` });
                }
                if (def.format === 'iso8601') {
                    const d = new Date(value);
                    if (isNaN(d.getTime())) {
                        errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be a valid ISO 8601 date` });
                    }
                }
                if (def.enum && def.enum.length > 0 && !def.enum.includes(value)) {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be one of: ${def.enum.join(', ')}` });
                }
            } else if (def.type === 'number') {
                if (typeof value !== 'number') {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be a number, got ${typeof value}` });
                    continue;
                }
                if (def.min !== undefined && value < def.min) {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be >= ${def.min}` });
                }
                if (def.max !== undefined && value > def.max) {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be <= ${def.max}` });
                }
            } else if (def.type === 'boolean') {
                if (typeof value !== 'boolean') {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be true or false` });
                }
            } else if (def.type === 'object') {
                if (typeof value !== 'object' || Array.isArray(value)) {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be an object` });
                } else if (def.fields) {
                    errors.push(...ConfigSchemas.validateFields(value, def.fields, fullPath));
                }
            } else if (def.type === 'array') {
                if (!Array.isArray(value)) {
                    errors.push({ severity: 'error', path: fullPath, message: `"${fullPath}" must be an array` });
                } else if (def.items && def.items.type === 'object' && def.items.fields) {
                    value.forEach((item, i) => {
                        const itemPath = `${fullPath}[${i}]`;
                        if (typeof item !== 'object' || Array.isArray(item)) {
                            errors.push({ severity: 'error', path: itemPath, message: `${itemPath} must be an object` });
                        } else {
                            errors.push(...ConfigSchemas.validateFields(item, def.items.fields, itemPath));
                        }
                    });
                } else if (def.items && def.items.type === 'string') {
                    value.forEach((item, i) => {
                        if (typeof item !== 'string') {
                            errors.push({ severity: 'error', path: `${fullPath}[${i}]`, message: `${fullPath}[${i}] must be a string` });
                        }
                    });
                }
            }
        }

        return errors;
    },

    /**
     * Full validation: parse + schema + cross-field rules.
     * @param {string} yamlStr - raw YAML string
     * @param {string} schemaId - 'store-config' | 'hub-config' | 'worlds-config'
     * @returns {{ errors: Array, parsed: object|null }}
     */
    validate(yamlStr, schemaId) {
        const schema = ConfigSchemas[schemaId];
        if (!schema) return { errors: [{ severity: 'error', message: `Unknown schema: ${schemaId}` }], parsed: null };

        const results = [];

        // Layer 1: YAML parse
        let parsed;
        try {
            parsed = jsyaml.load(yamlStr);
        } catch (e) {
            results.push({
                severity: 'error',
                line: e.mark ? e.mark.line + 1 : null,
                message: `YAML syntax error: ${e.reason || e.message}${e.mark ? ` (line ${e.mark.line + 1})` : ''}`
            });
            return { errors: results, parsed: null };
        }

        if (!parsed || typeof parsed !== 'object') {
            results.push({ severity: 'error', message: 'YAML must parse to an object' });
            return { errors: results, parsed: null };
        }

        // Layer 2: Schema validation
        if (schema.fields && Object.keys(schema.fields).length > 0) {
            results.push(...ConfigSchemas.validateFields(parsed, schema.fields, ''));
        }

        // Layer 3: Cross-field rules
        if (schema.crossFieldRules) {
            for (const rule of schema.crossFieldRules) {
                const result = rule(parsed);
                if (result) results.push(result);
            }
        }

        return { errors: results, parsed };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigSchemas;
}
