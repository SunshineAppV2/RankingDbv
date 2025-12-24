import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePathfinderCard = (user: any, clubName: string) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(41, 128, 185); // Blue
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(clubName, 105, 15, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Ficha de Membro', 105, 25, { align: 'center' });

    // Personal Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Nome: ${user.name}`, 14, 50);
    doc.text(`Email: ${user.email}`, 14, 58);
    doc.text(`Classe: ${user.dbvClass || 'Não definida'}`, 14, 66);
    doc.text(`Unidade: ${user.unit?.name || 'Não definida'}`, 100, 66);
    doc.text(`Pontos Totais: ${user.points}`, 14, 74);

    // Specialties Table
    if (user.specialties && user.specialties.length > 0) {
        doc.text('Especialidades Conquistadas:', 14, 90);

        const specialtyData = user.specialties.map((s: any) => [
            s.specialty?.name || '',
            s.specialty?.area || '',
            new Date(s.awardedAt).toLocaleDateString()
        ]);

        autoTable(doc, {
            startY: 95,
            head: [['Especialidade', 'Área', 'Data']],
            body: specialtyData,
        });
    }

    doc.save(`Ficha_${user.name}.pdf`);
};

export const generateFinancialReport = (transactions: any[], balanceData: any, clubName: string) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text(`Relatório Financeiro - ${clubName}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 28);

    // Summary
    doc.text(`Saldo Atual: R$ ${balanceData.balance.toFixed(2)}`, 14, 40);
    doc.setTextColor(0, 128, 0);
    doc.text(`Receitas: R$ ${balanceData.income.toFixed(2)}`, 14, 46);
    doc.setTextColor(192, 0, 0);
    doc.text(`Despesas: R$ ${balanceData.expense.toFixed(2)}`, 14, 52);
    doc.setTextColor(0, 0, 0);

    // Transactions Table
    const tableData = transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.description,
        t.category,
        t.type === 'INCOME' ? `+ ${t.amount.toFixed(2)}` : `- ${t.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 60,
        head: [['Data', 'Descrição', 'Categoria', 'Valor']],
        body: tableData,
    });

    doc.save(`Financeiro_${clubName}.pdf`);
};

export const generateMedicalFile = (user: any, clubName: string) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(231, 76, 60); // Red
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(clubName, 105, 15, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Ficha Médica e de Saúde', 105, 25, { align: 'center' });

    // Personal Info Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Dados Pessoais', 14, 50);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 52, 196, 52);

    doc.setFontSize(11);
    doc.text(`Nome: ${user.name}`, 14, 60);
    doc.text(`Data Nascimento: ${user.birthDate ? new Date(user.birthDate).toLocaleDateString() : '____/____/____'}`, 120, 60);
    doc.text(`CPF: ${user.cpf || '_________________'}`, 14, 68);
    doc.text(`RG: ${user.rg || '_________________'}`, 80, 68);
    doc.text(`SUS: ${user.susNumber || '_________________'}`, 140, 68);

    // Emergency Contact
    doc.setFontSize(14);
    doc.text('Em Caso de Emergência', 14, 80);
    doc.line(14, 82, 196, 82);

    doc.setFontSize(11);
    doc.text(`Nome: ${user.emergencyName || '_________________________________'}`, 14, 90);
    doc.text(`Telefone: ${user.emergencyPhone || '_________________'}`, 120, 90);
    doc.text(`Responsável (Pai/Mãe): ${user.fatherName || user.motherName || '_________________________________'}`, 14, 98);
    doc.text(`Telefone: ${user.fatherPhone || user.motherPhone || '_________________'}`, 120, 98);

    // Health Info
    doc.setFontSize(14);
    doc.text('Dados de Saúde', 14, 110);
    doc.line(14, 112, 196, 112);

    doc.setFontSize(11);
    doc.text(`Tipo Sanguíneo: ${user.bloodType || '__'} ${user.rhFactor || '__'}`, 14, 120);

    const yes = '[ X ]';
    const no = '[   ]';
    doc.text(`Diabetes: ${user.hasDiabetes ? yes : no}`, 14, 128);
    doc.text(`Problemas Cardíacos: ${user.hasHeartProblem ? yes : no}`, 14, 136);
    doc.text(`Problemas Renais: ${user.hasRenalProblem ? yes : no}`, 80, 128);
    doc.text(`Acompanhamento Psicológico: ${user.hasPsychProblem ? yes : no}`, 80, 136);

    doc.text('Alergias:', 14, 150);
    doc.setFontSize(10);
    doc.text(user.specificAllergies || 'Nenhuma relatada.', 14, 156, { maxWidth: 180 });

    doc.setFontSize(11);
    doc.text('Medicamentos de Uso Contínuo:', 14, 170);
    doc.setFontSize(10);
    doc.text(user.regularMedications || 'Nenhum relatado.', 14, 176, { maxWidth: 180 });

    doc.setFontSize(11);
    doc.text('Histórico de Doenças / Cirurgias Recentes:', 14, 190);
    doc.setFontSize(10);
    doc.text(user.diseasesHistory?.join(', ') || 'Nada consta', 14, 196, { maxWidth: 180 });


    // Signature Area
    doc.setFontSize(10);
    doc.text('___________________________________________________', 105, 270, { align: 'center' });
    doc.text('Assinatura do Responsável / Desbravador (+18)', 105, 275, { align: 'center' });
    doc.text(`Data: ____/____/______`, 105, 285, { align: 'center' });

    doc.save(`Ficha_Medica_${user.name}.pdf`);
};
