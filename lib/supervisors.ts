import {ProposalData} from './proposal';
export const supervisorKeys=['_supervisorEmail','_coSupervisorEmails'];
export const emailPattern=/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
export function coSupervisorEmails(data:ProposalData){return (data._coSupervisorEmails||'').split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean);}
export function supervisorError(data:ProposalData){if(!emailPattern.test(data._supervisorEmail||''))return 'Enter the main supervisor’s email address in Project details.';const co=coSupervisorEmails(data);if(co.length>4||co.some(e=>!emailPattern.test(e)))return 'Enter up to four valid co-supervisor email addresses, one per line.';return '';}
