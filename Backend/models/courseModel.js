import { query } from "../config/db.js";

const CourseModel = {
  // Create a course (instructor only)
  async create({
    title,
    description,
    instructor_id,
    category_id = null,
    price = 0.0,
    thumbnail_url = null,
  }) {
    try {
      const sql = `
        INSERT INTO courses (
          title, 
          description,
          instructor_id,
          category_id,
          price,
          thumbnail_url,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft')
        RETURNING *
      `;

      const { rows } = await query(sql, [
        title,
        description,
        instructor_id,
        category_id,
        price,
        thumbnail_url,
      ]);

      return rows[0];
    } catch (error) {
      console.error("Database Error:", error);
      throw error;
    }
  },

  // Get course by ID with instructor details
  async findById(id) {
    try {
      const sql = `
        SELECT c.*, u.name as instructor_name, u.email as instructor_email, cat.name as category_name
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE c.id = $1
      `;
      const { rows } = await query(sql, [id]);
      return rows[0];
    } catch (error) {
      console.error("Error finding course by ID:", error);
      throw error;
    }
  },

  // List all courses with filtering options
  async findAll({
    status = null,
    category_id = null,
    instructor_id = null,
    is_published = null,
    is_approved = null,
  } = {}) {
    try {
      let sql = `
        SELECT c.*, u.name as instructor_name, cat.name as category_name
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
      `;

      const params = [];
      let whereAdded = false;

      if (status) {
        sql += whereAdded ? " AND" : " WHERE";
        sql += ` c.status = $${params.length + 1}`;
        params.push(status);
        whereAdded = true;
      }

      if (category_id) {
        sql += whereAdded ? " AND" : " WHERE";
        sql += ` c.category_id = $${params.length + 1}`;
        params.push(category_id);
        whereAdded = true;
      }

      if (instructor_id) {
        sql += whereAdded ? " AND" : " WHERE";
        sql += ` c.instructor_id = $${params.length + 1}`;
        params.push(instructor_id);
        whereAdded = true;
      }

      if (is_published !== null) {
        sql += whereAdded ? " AND" : " WHERE";
        sql += ` c.is_published = $${params.length + 1}`;
        params.push(is_published);
        whereAdded = true;
      }

      if (is_approved !== null) {
        sql += whereAdded ? " AND" : " WHERE";
        sql += ` c.is_approved = $${params.length + 1}`;
        params.push(is_approved);
        whereAdded = true;
      }

      sql += " ORDER BY c.created_at DESC";

      const { rows } = await query(sql, params);
      return rows;
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw error;
    }
  },

  // Update course (instructor only)
  async update(
    id,
    {
      title,
      description,
      category_id,
      price,
      thumbnail_url,
      status,
      is_published,
      is_approved,
    }
  ) {
    try {
      const sql = `
        UPDATE courses
        SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          category_id = COALESCE($3, category_id),
          price = COALESCE($4, price),
          thumbnail_url = COALESCE($5, thumbnail_url),
          status = COALESCE($6, status),
          is_published = COALESCE($7, is_published),
          is_approved = COALESCE($8, is_approved),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `;

      const { rows } = await query(sql, [
        title,
        description,
        category_id,
        price,
        thumbnail_url,
        status,
        is_published,
        is_approved,
        id,
      ]);

      return rows[0];
    } catch (error) {
      console.error("Database Error:", error);
      throw error;
    }
  },

  // Delete course (instructor/admin)
  async delete(id) {
    try {
      const sql = `
        DELETE FROM courses
        WHERE id = $1
        RETURNING id, title
      `;

      const { rows } = await query(sql, [id]);
      return rows[0];
    } catch (error) {
      console.error("Database Error:", error);
      throw error;
    }
  },

  // Check if user is course instructor
  async isInstructor(course_id, user_id) {
    try {
      const sql = `
        SELECT 1 FROM courses
        WHERE id = $1 AND instructor_id = $2
      `;
      const { rows } = await query(sql, [course_id, user_id]);
      return rows.length > 0;
    } catch (error) {
      console.error("Database Error:", error);
      throw error;
    }
  },
};

export default CourseModel;
