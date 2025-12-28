
export interface Member {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: string;
    isActive: boolean;
    clubId: string | null;
    unitId?: string | null;
    club?: { name: string };
    dbvClass?: string | null;
    sex?: string;
    birthDate?: string;
    maritalStatus?: string;
    phone?: string;
    mobile?: string;
    isBaptized?: boolean;
    rg?: string;
    issuingOrg?: string;
    cpf?: string;
    shirtSize?: string;
    address?: string;
    addressNumber?: string;
    neighborhood?: string;
    cep?: string;
    city?: string;
    state?: string;
    complement?: string;
    educationLevel?: string;
    educationStatus?: string;
    knowledgeArea?: string;
    courseName?: string;
    institution?: string;
    schoolShift?: string;
    isHealthProfessional?: boolean;
    healthProfessionalType?: string;
    fatherName?: string;
    fatherEmail?: string;
    fatherPhone?: string;
    motherName?: string;
    motherEmail?: string;
    motherPhone?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    emergencyRelation?: string;
    susNumber?: string;
    healthPlan?: string;
    bloodType?: string;
    rhFactor?: string;
    diseasesHistory?: string[];
    hasHeartProblem?: boolean;
    heartProblemDesc?: string;
    hasDiabetes?: boolean;
    hasRenalProblem?: boolean;
    hasPsychProblem?: boolean;
    regularMedications?: string;
    specificAllergies?: string;
    recentTrauma?: string;
    recentFracture?: string;
    recentSurgery?: string;
    disabilities?: string[];
    healthNotes?: string;
    parentId?: string | null;
    children?: { id: string }[];
}

export interface Unit {
    id: string;
    name: string;
}

export const ROLE_TRANSLATIONS: Record<string, string> = {
    OWNER: 'DIRETOR(A) DO CLUBE',
    ADMIN: 'ADMINISTRADOR',
    DIRECTOR: 'DIRETOR(A) DO CLUBE',
    SECRETARY: 'SECRETÁRIO(A)',
    COUNSELOR: 'CONSELHEIRO(A)',
    INSTRUCTOR: 'INSTRUTOR',
    PATHFINDER: 'DESBRAVADOR',
    PARENT: 'RESPONSÁVEL'
};

export const INITIAL_FORM_DATA = {
    name: '',
    email: '',
    password: '',
    role: 'PATHFINDER',
    isActive: true,
    clubId: '',
    unitId: '',
    dbvClass: '',
    sex: 'M',
    birthDate: '',
    maritalStatus: 'SOLTEIRO',
    phone: '',
    mobile: '',
    isBaptized: false,
    rg: '',
    issuingOrg: '',
    cpf: '',
    shirtSize: '',
    address: '',
    addressNumber: '',
    neighborhood: '',
    cep: '',
    city: '',
    state: '',
    complement: '',
    educationLevel: '',
    educationStatus: '',
    knowledgeArea: '',
    courseName: '',
    institution: '',
    schoolShift: '',
    isHealthProfessional: false,
    healthProfessionalType: '',
    fatherName: '',
    fatherEmail: '',
    fatherPhone: '',
    motherName: '',
    motherEmail: '',
    motherPhone: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    susNumber: '',
    healthPlan: '',
    bloodType: '',
    rhFactor: '',
    diseasesHistory: [] as string[],
    hasHeartProblem: false,
    heartProblemDesc: '',
    hasDiabetes: false,
    hasRenalProblem: false,
    hasPsychProblem: false,
    regularMedications: '',
    specificAllergies: '',
    recentTrauma: '',
    recentFracture: '',
    recentSurgery: '',
    disabilities: [] as string[],
    healthNotes: ''
};
