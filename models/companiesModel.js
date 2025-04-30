const pool = require("../dataBase/dataBase.js");

module.exports = {
  // Получение списка компаний (сортировка по дате создания, например)
  findAll: async () => {
    const result = await pool.query(
      "SELECT * FROM companies ORDER BY created_at DESC"
    );
    return result.rows;
  },

  // Получение подробной информации о компании, включая связанные услуги, цены и филиалы
  findById: async (companyId) => {
    const query = `
      SELECT 
        c.*, 
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'id', s.id,
            'name', s.name, 
            'price', s.price
          )
        ) FILTER (WHERE s.id IS NOT NULL), '[]') AS services,
        COALESCE(json_agg(
          DISTINCT jsonb_build_object(
            'address', b.address,
            'phone', b.phone
          )
        ) FILTER (WHERE b.id IS NOT NULL), '[]') AS branches
      FROM companies c
      LEFT JOIN services s ON s.company_id = c.id
      LEFT JOIN branches b ON b.company_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const result = await pool.query(query, [companyId]);
    return result.rows[0];
  },

  findOnlyCompany: async (companyId) => {
    const companyQuery = `SELECT * FROM companies WHERE id = $1`;
    const company = await pool.query(companyQuery, [companyId]);
    return company.rows[0];
  },

  // Поиск компаний по ключевому слову и/или по категории
  searchCompanies: async ({ searchTerm, categoryId }) => {
    let query = `
      SELECT DISTINCT c.*
      FROM companies c
      LEFT JOIN company_categories cc ON cc.company_id = c.id
      WHERE (LOWER(c.name) LIKE LOWER($1) OR LOWER(c.description) LIKE LOWER($1))
    `;
    const params = [`%${searchTerm}%`];
    if (categoryId) {
      query += " AND cc.category_id = $2";
      params.push(categoryId);
    }
    query += " ORDER BY c.name";
    const result = await pool.query(query, params);
    return result.rows;
  },

  // Создание новой компании
  createCompany: async ({ name, description, address, phone, email, website, experience_years, advantages }) => {
    const query = `
      INSERT INTO companies(name, description, address, phone, email, website, experience_years, advantages, created_at)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `;
    const result = await pool.query(query, [
      name, description, address, phone, email, website, experience_years, advantages
    ]);
    const id = result.rows[0].id || null;
    return id;
  },

  // Обновление данных компании
  updateCompany: async (id, { name, description, address, phone, email, website, experience_years, advantages }) => {
    const query = `
      UPDATE companies SET
          name = $1,
          description = $2,
          address = $3,
          phone = $4,
          email = $5,
          website = $6,
          experience_years = $7,
          advantages = $8
      WHERE id = $9
      RETURNING *
    `;
    const result = await pool.query(query, [
      name, description, address, phone, email, website, experience_years, advantages, id
    ]);
    return result.rows[0];
  },

  // Удаление компании
  deleteCompany: async (id) => {
    await pool.query("DELETE FROM companies WHERE id = $1", [id]);
  },

  getAllCategories: async () => {
    const result = await pool.query('SELECT id, name FROM categories ORDER BY name');
    return result.rows;
  },

  getAllCompanies: async () => {
    const result = await pool.query('SELECT * FROM companies ORDER BY name');
    return result.rows;
  },

  setBranches: async (companyId, branches) => {
    await pool.query('DELETE FROM branches WHERE company_id = $1', [companyId]);
    if (Array.isArray(branches)) {
      const insertPromises = branches.map((branch) =>
        pool.query('INSERT INTO branches (company_id, address, phone) VALUES ($1, $2, $3)', [companyId, branch.address, branch.phone])
      );
      await Promise.all(insertPromises);
    }
  },

  setServices: async (companyId, services) => {
    // Удаляем все сервисы для данной компании
    await pool.query('DELETE FROM services WHERE company_id = $1', [companyId]);

    // Если передан массив сервисов, вставляем каждый из них
    if (Array.isArray(services)) {
      const insertPromises = services.map(service =>
        pool.query(
          'INSERT INTO services (company_id, name, price) VALUES ($1, $2, $3)',
          [companyId, service.name, service.price]
        )
      );
      await Promise.all(insertPromises);
    }
  },

  setCategories: async (companyId, categoryIds) => {
    await pool.query('DELETE FROM company_categories WHERE company_id = $1', [companyId]);
    if (Array.isArray(categoryIds)) {
      const insertPromises = categoryIds.map((categoryId) =>
        pool.query('INSERT INTO company_categories (company_id, category_id) VALUES ($1, $2)', [companyId, categoryId])
      );
      await Promise.all(insertPromises);
    }
  },

  getCategoryIds: async (companyId) => {
    const result = await pool.query('SELECT category_id FROM company_categories WHERE company_id = $1', [companyId]);
    return result.rows.map((row) => row.category_id);
  },

  getCompanyPriceStats: async (companyId, serviceId) => {
    // Получаем историю цен по компании и сервису
    const historyQuery = `
    SELECT price, changed_at
    FROM price_history
    WHERE company_id = $1 AND service_id = $2
    ORDER BY changed_at ASC`;
    const historyResult = await pool.query(historyQuery, [companyId, serviceId]);
    return historyResult.rows;
  },

  getCompanyServiceById: async (serviceId) => {
    const serviceQuery = `SELECT * FROM services WHERE id = $1`;
    const service = await pool.query(serviceQuery, [serviceId]);
    return service.rows[0];
  }

};
