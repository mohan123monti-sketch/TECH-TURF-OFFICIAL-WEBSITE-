// CLIENTS CONTROLLER

export const getClients = async (req, res) => {
    const db = req.db;
    try {
        const clients = await db.all('SELECT * FROM clients ORDER BY created_at DESC');
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getClientById = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        const client = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createClient = async (req, res) => {
    const {
        fullName, companyName, clientType, phone, email,
        alternateContact, preferredCommunication, city, state, country,
        address, industry, website, companySize, about,
        serviceRequested, projectIdea, detailedRequirement, projectPurpose,
        estimatedBudget, budgetRange, expectedDeadline, urgencyLevel,
        leadSource, referredBy, status, priorityLevel, assignedManagerId,
        communicationLog, ndaRequired, agreementSigned, permissionToShowcase, analyticalData
    } = req.body;

    const db = req.db;
    try {
        const result = await db.run(
            `INSERT INTO clients (
                fullName, companyName, clientType, phone, email, 
                alternateContact, preferredCommunication, city, state, country, 
                address, industry, website, companySize, about, 
                serviceRequested, projectIdea, detailedRequirement, projectPurpose, 
                estimatedBudget, budgetRange, expectedDeadline, urgencyLevel, 
                leadSource, referredBy, status, priorityLevel, assignedManagerId, 
                communicationLog, ndaRequired, agreementSigned, permissionToShowcase, analyticalData
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fullName, companyName, clientType, phone, email,
                alternateContact, preferredCommunication, city, state, country,
                address, industry, website, companySize, about,
                serviceRequested, projectIdea, detailedRequirement, projectPurpose,
                estimatedBudget, budgetRange, expectedDeadline, urgencyLevel,
                leadSource, referredBy, status, priorityLevel, assignedManagerId,
                JSON.stringify(communicationLog), ndaRequired ? 1 : 0,
                agreementSigned ? 1 : 0, permissionToShowcase ? 1 : 0, JSON.stringify(analyticalData)
            ]
        );
        res.status(201).json({ id: result.lastID, fullName, email });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateClient = async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const db = req.db;
    try {
        const existing = await db.get('SELECT id FROM clients WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ message: 'Client not found' });

        const sql = `UPDATE clients SET 
            fullName=?, companyName=?, clientType=?, phone=?, email=?, 
            alternateContact=?, preferredCommunication=?, city=?, state=?, country=?, 
            address=?, industry=?, website=?, companySize=?, about=?, 
            serviceRequested=?, projectIdea=?, detailedRequirement=?, projectPurpose=?, 
            estimatedBudget=?, budgetRange=?, expectedDeadline=?, urgencyLevel=?, 
            leadSource=?, referredBy=?, status=?, priorityLevel=?, assignedManagerId=?, 
            communicationLog=?, ndaRequired=?, agreementSigned=?, permissionToShowcase=?, analyticalData=?,
            updated_at=CURRENT_TIMESTAMP WHERE id=?`;

        await db.run(sql, [
            body.fullName, body.companyName, body.clientType, body.phone, body.email,
            body.alternateContact, body.preferredCommunication, body.city, body.state, body.country,
            body.address, body.industry, body.website, body.companySize, body.about,
            body.serviceRequested, body.projectIdea, body.detailedRequirement, body.projectPurpose,
            body.estimatedBudget, body.budgetRange, body.expectedDeadline, body.urgencyLevel,
            body.leadSource, body.referredBy, body.status, body.priorityLevel, body.assignedManagerId,
            JSON.stringify(body.communicationLog), body.ndaRequired ? 1 : 0,
            body.agreementSigned ? 1 : 0, body.permissionToShowcase ? 1 : 0, JSON.stringify(body.analyticalData), id
        ]);

        res.json({ message: 'Client updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteClient = async (req, res) => {
    const { id } = req.params;
    const db = req.db;
    try {
        await db.run('DELETE FROM clients WHERE id = ?', [id]);
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
