const pool = require("../config/database");

/**
 * Get agent performance report
 */
exports.getAgentPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    const params = [];

    if (startDate) {
      dateFilter += ` AND ch.interaction_datetime >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ` AND ch.interaction_datetime <= ?`;
      params.push(endDate);
    }

    const query = `
            SELECT 
                e.empno_pk,
                e.name as agent_name,
                e.empcode,
                COUNT(ch.history_pk) as total_interactions,
                COUNT(CASE WHEN ch.interaction_type = 'call' THEN 1 END) as total_calls,
                COUNT(CASE WHEN ch.interaction_type = 'sms' THEN 1 END) as total_sms,
                COUNT(CASE WHEN ch.interaction_type = 'whatsapp' THEN 1 END) as total_whatsapp,
                COUNT(CASE WHEN ch.callstatus = 'Sales Generated' THEN 1 END) as sales_generated,
                COUNT(DISTINCT ch.custno_fk) as unique_customers_contacted
            FROM employees e
            LEFT JOIN call_history ch ON e.empno_pk = ch.empno_fk ${dateFilter}
            WHERE e.role IN ('Agent', 'Trainee') AND e.empstatus = 'Active'
            GROUP BY e.empno_pk, e.name, e.empcode
            ORDER BY total_interactions DESC
        `;

    const [result] = await pool.execute(query, params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get agent performance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching agent performance",
      error: error.message,
    });
  }
};

/**
 * Get project performance report
 */
exports.getProjectPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    const params = [];

    if (startDate) {
      dateFilter += ` AND ch.interaction_datetime >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ` AND ch.interaction_datetime <= ?`;
      params.push(endDate);
    }

    const query = `
            SELECT 
                p.projectno_pk,
                p.projectname,
                p.projectcode,
                COUNT(ch.history_pk) as total_interactions,
                COUNT(CASE WHEN ch.callstatus = 'Sales Generated' THEN 1 END) as sales_generated
            FROM projects p
            LEFT JOIN customer c ON p.projectno_pk = c.projectno_fk
            LEFT JOIN call_history ch ON c.custno_pk = ch.custno_fk ${dateFilter}
            GROUP BY p.projectno_pk, p.projectname, p.projectcode
            ORDER BY total_interactions DESC
        `;

    const [result] = await pool.execute(query, params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get project performance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching project performance",
      error: error.message,
    });
  }
};

/**
 * Get daily activity report
 */
exports.getDailyActivity = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Default to last 30 days if not provided?

    let dateFilter = "";
    const params = [];

    if (startDate) {
      dateFilter += ` AND ch.interaction_datetime >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ` AND ch.interaction_datetime <= ?`;
      params.push(endDate);
    }

    const query = `
            SELECT 
                DATE(ch.interaction_datetime) as date,
                COUNT(ch.history_pk) as total_interactions,
                COUNT(CASE WHEN ch.callstatus = 'Sales Generated' THEN 1 END) as sales_generated
            FROM call_history ch
            WHERE 1=1 ${dateFilter}
            GROUP BY DATE(ch.interaction_datetime)
            ORDER BY date DESC
            LIMIT 30
        `;

    const [result] = await pool.execute(query, params);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get daily activity error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching daily activity",
      error: error.message,
    });
  }
};
