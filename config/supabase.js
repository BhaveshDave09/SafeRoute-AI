const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if credentials are missing or placeholders
const isMock = !supabaseUrl || 
               !supabaseServiceKey || 
               supabaseUrl.includes('your_supabase_project_url_here') || 
               supabaseUrl.includes('placeholder') || 
               supabaseServiceKey.includes('placeholder');

let supabase;
let supabasePublic;

if (isMock) {
  console.warn('\n[SafeRoute DB] ⚠️ WARNING: Missing or placeholder Supabase credentials. Using in-memory mock database!');

  // Simple in-memory storage simulating Supabase records
  const db = {
    incidents: [
      {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        latitude: 28.6139,
        longitude: 77.2090,
        incident_type: 'theft',
        severity: 'high',
        description: 'Bag snatching near metro station',
        ai_tags: ['theft', 'nighttime'],
        ai_validated: true,
        ai_note: null,
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: '2c2eeb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e',
        latitude: 28.6315,
        longitude: 77.2167,
        incident_type: 'harassment',
        severity: 'medium',
        description: 'Verbal harassment in isolated park walkway',
        ai_tags: ['harassment', 'isolated_area'],
        ai_validated: true,
        ai_note: null,
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      },
      {
        id: '3d3ffb4d-3b7d-4bad-9bdd-2b0d7b3dcb6f',
        latitude: 28.6129,
        longitude: 77.2295,
        incident_type: 'poor lighting',
        severity: 'low',
        description: 'Streetlights not working on the main pavement',
        ai_tags: ['lighting_issue'],
        ai_validated: true,
        ai_note: null,
        created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      }
    ],
    sos_logs: [],
    route_analysis: [],
    journeys: [],
    emergency_contacts: []
  };

  const createQueryBuilder = (table) => {
    let data = db[table] || [];
    let isCountOnly = false;

    const chain = {
      insert: (records) => {
        const recordsToInsert = Array.isArray(records) ? records : [records];
        const newRecords = recordsToInsert.map(r => {
          const row = {
            id: require('uuid').v4 ? require('uuid').v4() : Math.random().toString(36).substring(2, 11),
            created_at: new Date().toISOString(),
            ...r
          };
          db[table].unshift(row);
          return row;
        });
        
        const selectChain = {
          select: () => ({
            single: () => ({ data: newRecords[0], error: null }),
            data: newRecords,
            error: null
          }),
          single: () => ({ data: newRecords[0], error: null }),
          data: newRecords,
          error: null
        };
        return selectChain;
      },
      select: (columns, options) => {
        if (options && (options.count === 'exact' || options.count === 'planned')) {
          if (options.head) {
            isCountOnly = true;
          }
        }
        return chain;
      },
      eq: (field, value) => {
        data = data.filter(item => {
          if (item[field] === undefined) return false;
          return String(item[field]).toLowerCase() === String(value).toLowerCase();
        });
        return chain;
      },
      ilike: (field, pattern) => {
        const queryStr = pattern.replace(/%/g, '').toLowerCase();
        data = data.filter(item => {
          if (!item[field]) return false;
          return String(item[field]).toLowerCase().includes(queryStr);
        });
        return chain;
      },
      gte: (field, value) => {
        data = data.filter(item => {
          if (!item[field]) return false;
          return new Date(item[field]) >= new Date(value);
        });
        return chain;
      },
      order: (field, orderOptions) => {
        const ascending = orderOptions && orderOptions.ascending;
        data = [...data].sort((a, b) => {
          if (a[field] < b[field]) return ascending ? -1 : 1;
          if (a[field] > b[field]) return ascending ? 1 : -1;
          return 0;
        });
        return chain;
      },
      limit: (count) => {
        data = data.slice(0, count);
        return chain;
      },
      range: (from, to) => {
        data = data.slice(from, to + 1);
        return chain;
      },
      update: (fieldsToUpdate) => {
        const updateChain = {
          eq: (field, value) => {
            const matchedRows = [];
            db[table] = db[table].map(item => {
              if (String(item[field]).toLowerCase() === String(value).toLowerCase()) {
                const updatedItem = { ...item, ...fieldsToUpdate };
                matchedRows.push(updatedItem);
                return updatedItem;
              }
              return item;
            });
            
            const selectChain = {
              select: () => ({
                single: () => ({ data: matchedRows[0] || null, error: matchedRows[0] ? null : { message: 'Not found' } }),
                data: matchedRows,
                error: null
              }),
              single: () => ({ data: matchedRows[0] || null, error: matchedRows[0] ? null : { message: 'Not found' } }),
              data: matchedRows,
              error: null
            };
            return selectChain;
          }
        };
        return updateChain;
      },
      single: () => {
        const first = data[0];
        if (!first) {
          return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
        }
        return { data: first, error: null };
      },
      then: (onfulfilled) => {
        if (isCountOnly) {
          return Promise.resolve(onfulfilled({ data: null, error: null, count: data.length }));
        }
        return Promise.resolve(onfulfilled({ data, error: null, count: data.length }));
      }
    };

    return chain;
  };

  supabase = {
    from: (table) => {
      if (!db[table]) db[table] = [];
      return createQueryBuilder(table);
    }
  };

  supabasePublic = supabase;
} else {
  // Service role client — bypasses RLS, used for server-side operations
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Anon client — for public-facing operations respecting RLS
  supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
}

module.exports = { supabase, supabasePublic };
