// Entity API on top of a Supabase client. Used by BOTH the website (src/api/base44Client.js)
// and the edge functions (supabase/functions/_shared/backend.js), so the two never drift.
// It keeps the call shapes the app was written against:
//   list(sort, limit) / filter(query, sort, limit) / get / create / update / delete / count
//   bulkCreate / bulkUpdate / updateMany / deleteMany

export const tableName = (entity) => entity.replace(/(?<!^)(?=[A-Z])/g, "_").toLowerCase();

// Tables a visitor may add to but not read back (see the RLS policies).
const INSERT_ONLY = new Set(["Subscriber"]);

function fail(error) {
  const err = new Error(error.message || "Database error");
  err.status = Number(error.status) || (error.code === "PGRST116" ? 404 : 400);
  err.code = error.code;
  return err;
}

async function run(builder) {
  const { data, error, count } = await builder;
  if (error) throw fail(error);
  return { data, count };
}

function applyQuery(builder, query = {}) {
  for (const [key, value] of Object.entries(query || {})) {
    if (Array.isArray(value)) builder = builder.in(key, value);
    else if (value === null) builder = builder.is(key, null);
    else builder = builder.eq(key, value);
  }
  return builder;
}

function applySort(builder, sort, limit) {
  if (sort) {
    const desc = sort.startsWith("-");
    builder = builder.order(desc ? sort.slice(1) : sort, { ascending: !desc, nullsFirst: false });
  }
  return limit ? builder.limit(limit) : builder;
}

export function entityApi(supabase, entity) {
  const from = () => supabase.from(tableName(entity));
  const rows = async (query, sort, limit) =>
    (await run(applySort(applyQuery(from().select("*"), query), sort, limit))).data || [];

  return {
    // Two call styles exist in the code base: (sort, limit) returns an array,
    // ({ sort, limit }) returns { items } — keep both.
    list: (sort, limit) =>
      sort && typeof sort === "object"
        ? rows({}, sort.sort, sort.limit).then((items) => ({ items }))
        : rows({}, sort, limit),
    filter: (query, sort, limit) =>
      sort && typeof sort === "object"
        ? rows(query, sort.sort, sort.limit).then((items) => ({ items }))
        : rows(query, sort, limit),
    async get(id) {
      const { data } = await run(from().select("*").eq("id", id).maybeSingle());
      if (!data) throw fail({ message: `${entity} not found`, status: 404 });
      return data;
    },
    async count(query) {
      return (await run(applyQuery(from().select("*", { count: "exact", head: true }), query))).count || 0;
    },
    async create(data) {
      if (INSERT_ONLY.has(entity)) {
        await run(from().insert(data));
        return data;
      }
      return (await run(from().insert(data).select().single())).data;
    },
    async bulkCreate(records) {
      // records may leave out different fields: a missing one takes the column default, not NULL
      return (await run(from().insert(records, { defaultToNull: false }).select())).data;
    },
    async update(id, data) {
      return (await run(from().update(data).eq("id", id).select().single())).data;
    },
    async bulkUpdate(records) {
      return Promise.all(records.map(({ id, ...data }) => this.update(id, data)));
    },
    // updateMany({ id: [..] }, { $set: {...} })
    async updateMany(query, change) {
      return (await run(applyQuery(from().update(change.$set || change), query).select())).data;
    },
    async delete(id) {
      await run(from().delete().eq("id", id));
    },
    async deleteMany(query) {
      if (!query || Object.keys(query).length === 0) throw new Error("deleteMany needs a filter");
      await run(applyQuery(from().delete(), query));
    },
  };
}

export const entitiesProxy = (supabase) =>
  new Proxy({}, { get: (_t, entity) => (typeof entity === "string" ? entityApi(supabase, entity) : undefined) });
