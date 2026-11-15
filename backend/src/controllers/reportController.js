import pool from "../config/db.js";

export const ReportController = {
    /**
     * POST /api/reports
     * Report a product or user
     */
    async createReport(req, res) {
        try {
            const { target_id, target_type, reason } = req.body;
            const reporter_id = req.user.id;

            if (!target_id || !target_type || !reason) {
                return res.status(400).json({
                    success: false,
                    message: "target_id, target_type, and reason are required"
                });
            }

            const result = await pool.query(
                "INSERT INTO reports (reporter_id, target_id, target_type, reason) VALUES ($1, $2, $3, $4) RETURNING *",
                [reporter_id, target_id, target_type, reason]
            );

            res.status(201).json({
                success: true,
                message: "Thank you for the report. Our moderators will review it shortly.",
                report: result.rows[0]
            });
        } catch (error) {
            console.error("❌ [REPORT ERROR]:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    },

    /**
     * GET /api/admin/reports (Optional for admin panel)
     */
    async getReports(req, res) {
        try {
            const result = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
            res.json({
                success: true,
                reports: result.rows
            });
        } catch (error) {
            console.error("❌ [GET REPORTS ERROR]:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
};
