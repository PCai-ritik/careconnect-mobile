/**
 * Prescription Template Generator
 * 
 * Provides professional prescription HTML templates with dynamic doctor/hospital data
 * Multi-tenant compatible - works with any hospital branding
 * A4 full-page layout with proper formatting
 */

import type { MedicalRecord, PatientProfile } from './types';

export interface PrescriptionData {
    record: MedicalRecord;
    doctor: {
        name: string;
        specialization: string;
        license: string;
        phone?: string;
        clinicName?: string;
        clinicAddress?: string;
    };
    hospital: {
        name: string;
        primaryColor: string;
        secondaryColor?: string;
        headingFont?: string;
        bodyFont?: string;
        logoUrl?: string;
    };
    patient?: PatientProfile | null;
    /** Pre-computed age string (e.g. "34") used when no DOB is available on the patient record */
    patientAgeOverride?: string;
}

export function generatePrescriptionHTML(data: PrescriptionData): string {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const { record, doctor, hospital, patient } = data;
    
    // Get colors from hospital branding, with fallbacks
    const primaryColor = hospital.primaryColor || '#1a3a52';
    const accentColor = hospital.secondaryColor || '#7bc041';
    
    // Get fonts from hospital branding, with fallbacks
    const bodyFont = hospital.bodyFont || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    const headingFont = hospital.headingFont || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    
    // Calculate age — prefer DOB, fall back to manually-supplied override
    let patientAge = '';
    if (patient?.date_of_birth) {
        const dob = new Date(patient.date_of_birth);
        const todayDate = new Date();
        patientAge = String(Math.floor((todayDate.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
    }
    if (!patientAge && data.patientAgeOverride) {
        patientAge = data.patientAgeOverride;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Prescription - ${record.diagnosis}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { 
            size: A4; 
            margin: 0;
        }
        html, body { 
            width: 100%;
            height: 100%;
            font-family: ${bodyFont}; 
            background: white; 
        }
        .container {
            width: 100%;
            height: 100vh;
            background: white;
            display: flex;
            flex-direction: column;
            page-break-after: always;
            padding: 0;
        }
        
        /* Header with two-tone stripe using tenant colors */
        .header-stripe {
            display: flex;
            height: 12px;
            background: linear-gradient(90deg, ${primaryColor} 0%, ${primaryColor} 40%, ${accentColor} 40%, ${accentColor} 100%);
        }
        
        /* Doctor & Hospital Info Section */
        .doctor-section {
            display: flex;
            align-items: flex-start;
            padding: 25px 40px;
            gap: 25px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .doctor-info {
            flex: 1;
        }
        
        .doctor-name {
            font-size: 24px;
            font-weight: bold;
            color: ${primaryColor};
            font-family: ${headingFont};
            margin-bottom: 3px;
        }
        
        .doctor-details {
            font-size: 12px;
            color: #666;
            line-height: 1.5;
            font-family: ${bodyFont};
        }
        
        .hospital-logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
            flex-shrink: 0;
        }
        
        .hospital-logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
            flex-shrink: 0;
        }
        
        .default-logo {
            width: 80px;
            height: 80px;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .default-logo svg {
            width: 48px;
            height: 48px;
            color: ${primaryColor};
            stroke: ${primaryColor};
        }
        
        .hospital-name-section {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .hospital-name {
            font-size: 16px;
            font-weight: 600;
            color: ${primaryColor};
            font-family: ${headingFont};
            margin-bottom: 3px;
        }
        
        /* Prescription Box */
        .prescription-box {
            flex: 1;
            margin: 20px 40px;
            border: 2px solid #ddd;
            border-radius: 4px;
            padding: 20px;
            background: #fafafa;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }
        
        .prescription-content {
            flex: 1;
        }
        
        .whitespace-filler {
            flex: 1;
            min-height: 100px;
        }
        
        .patient-header {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .patient-field {
            display: flex;
            flex-direction: column;
        }
        
        .field-label {
            font-size: 11px;
            font-weight: 600;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            font-family: ${headingFont};
        }
        
        .field-value {
            font-size: 14px;
            color: #333;
            font-weight: 500;
            font-family: ${bodyFont};
        }
        
        .clinical-section {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .section-heading {
            font-size: 12px;
            font-weight: 700;
            color: ${primaryColor};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
            font-family: ${headingFont};
        }
        
        .section-content {
            font-size: 13px;
            color: #555;
            line-height: 1.6;
            font-family: ${bodyFont};
        }
        
        .vitals-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-top: 8px;
        }
        
        .vital-item {
            background: white;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 12px;
            font-family: ${bodyFont};
        }
        
        .vital-label {
            font-size: 10px;
            color: #999;
            text-transform: uppercase;
            font-family: ${headingFont};
        }
        
        .vital-value {
            font-size: 13px;
            font-weight: 600;
            color: #333;
            font-family: ${bodyFont};
        }
        
        /* Medications Section */
        .medications-section {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .rx-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
        }
        
        .rx-symbol {
            font-size: 32px;
            font-weight: bold;
            color: ${accentColor};
            font-family: Georgia, serif;
        }
        
        .medications-list {
            list-style: none;
            padding: 0;
        }
        
        .medication-item {
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
            font-size: 13px;
            line-height: 1.6;
            font-family: ${bodyFont};
        }
        
        .medication-item:last-child {
            border-bottom: none;
        }
        
        .medication-name {
            font-weight: 600;
            color: #333;
            font-family: ${headingFont};
        }
        
        .medication-details {
            color: #666;
            font-size: 12px;
            font-family: ${bodyFont};
        }
        
        /* Footer with two-tone stripe */
        .footer-stripe {
            display: flex;
            height: 12px;
            background: linear-gradient(90deg, ${accentColor} 0%, ${accentColor} 60%, ${primaryColor} 60%, ${primaryColor} 100%);
        }
        
        .footer-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            padding: 15px 40px;
            font-size: 11px;
            color: #999;
            text-align: center;
            font-family: ${bodyFont};
        }
        
        .footer-item {
            border-right: 1px solid #e0e0e0;
        }
        
        .footer-item:last-child {
            border-right: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Top Stripe -->
        <div class="header-stripe"></div>
        
        <!-- Doctor & Hospital Info -->
        <div class="doctor-section">
            <!-- Doctor Info (Left) -->
            <div class="doctor-info">
                <div class="doctor-name">Dr. ${doctor.name}</div>
                <div class="doctor-details">
                    ${doctor.specialization}<br/>
                    ${doctor.license ? `Reg No: ${doctor.license}` : ''}
                    ${doctor.clinicName && doctor.clinicAddress ? `<br/>${doctor.clinicName}, ${doctor.clinicAddress}` : doctor.clinicName ? `<br/>${doctor.clinicName}` : ''}
                </div>
            </div>
            
            <!-- Hospital Logo + Name (Center & Right) -->
            <div class="hospital-logo-section">
                <!-- Logo -->
                ${hospital.logoUrl ? `
                    <img src="${hospital.logoUrl}" alt="Logo" class="hospital-logo" />
                ` : `
                    <div class="default-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                    </div>
                `}
                
                <!-- Hospital Name (Vertically Centered) -->
                <div class="hospital-name-section">
                    <div class="hospital-name">${hospital.name}</div>
                </div>
            </div>
        </div>
        
        <!-- Prescription Box -->
        <div class="prescription-box">
            <div class="prescription-content">
                <!-- Patient Details -->
                <div class="patient-header">
                    <div class="patient-field">
                        <div class="field-label">Patient Name</div>
                        <div class="field-value">${patient?.full_name || '________________'}</div>
                    </div>
                    <div class="patient-field">
                        <div class="field-label">Age</div>
                        <div class="field-value">${patientAge || '____'} years</div>
                    </div>
                    <div class="patient-field">
                        <div class="field-label">Date</div>
                        <div class="field-value">${today}</div>
                    </div>
                </div>
                
                <!-- Clinical Section -->
                ${record.symptoms || record.diagnosis || (record.vitals && Object.keys(record.vitals).length > 0) ? `
                <div class="clinical-section">
                    ${record.symptoms ? `
                        <div style="margin-bottom: 12px;">
                            <div class="section-heading">Chief Complaints</div>
                            <div class="section-content">${record.symptoms}</div>
                        </div>
                    ` : ''}
                    
                    ${record.vitals && Object.keys(record.vitals).length > 0 ? `
                        <div style="margin-bottom: 12px;">
                            <div class="section-heading">Vitals</div>
                            <div class="vitals-grid">
                                ${record.vitals.bp ? `<div class="vital-item"><div class="vital-label">BP</div><div class="vital-value">${record.vitals.bp}</div></div>` : ''}
                                ${record.vitals.pulse ? `<div class="vital-item"><div class="vital-label">Pulse</div><div class="vital-value">${record.vitals.pulse}</div></div>` : ''}
                                ${record.vitals.temp ? `<div class="vital-item"><div class="vital-label">Temp</div><div class="vital-value">${record.vitals.temp}</div></div>` : ''}
                                ${record.vitals.weight ? `<div class="vital-item"><div class="vital-label">Weight</div><div class="vital-value">${record.vitals.weight}</div></div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${record.diagnosis ? `
                        <div>
                            <div class="section-heading">Diagnosis</div>
                            <div class="section-content">${record.diagnosis}</div>
                        </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <!-- Medications -->
                ${record.prescriptions.length > 0 ? `
                <div class="medications-section">
                    <div class="rx-header">
                        <div class="rx-symbol">℞</div>
                        <div class="section-heading" style="margin: 0;">Medications</div>
                    </div>
                    <ul class="medications-list">
                        ${record.prescriptions.map((p, idx) => `
                            <li class="medication-item">
                                <div class="medication-name">${idx + 1}. ${p.medication_name}</div>
                                <div class="medication-details">
                                    ${p.dosage ? `Dosage: ${p.dosage}` : ''} 
                                    ${p.frequency ? `| Frequency: ${p.frequency}` : ''} 
                                    ${p.duration ? `| Duration: ${p.duration}` : ''}
                                    ${p.notes ? `<br/>Instructions: ${p.notes}` : ''}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <!-- Treatment & Follow-up -->
                ${record.treatment ? `
                <div class="clinical-section">
                    <div class="section-heading">Treatment</div>
                    <div class="section-content">${record.treatment}</div>
                </div>
                ` : ''}
                
                ${record.follow_up_date ? `
                <div class="clinical-section">
                    <div class="section-heading">Follow-up Date</div>
                    <div class="section-content">${new Date(record.follow_up_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                ` : ''}
            </div>
            
            <!-- Whitespace Filler to stretch to A4 -->
            <div class="whitespace-filler"></div>
        </div>
        
        <!-- Footer Info -->
        <div class="footer-info">
            <div class="footer-item">📞 ${doctor.phone || 'Phone: Contact Clinic'}</div>
            <div class="footer-item">🏥 ${hospital.name}</div>
        </div>
        
        <!-- Bottom Stripe -->
        <div class="footer-stripe"></div>
    </div>
</body>
</html>
    `;
}
