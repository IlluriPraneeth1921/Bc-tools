-- Query to delete program Enrollment records
--Start

select * from CaseModule.[case]
where PersonKey = 'c7a3862e-f166-466d-a5fb-b4670130aebd'

Select * from ProgramEnrollmentModule.ProgramEnrollment
where CaseKey = 'AA8A3290-0F50-4D45-9C52-B4670130AFD4'

delete from ProgramEnrollmentModule.ProgramEnrollment
where ProgramEnrollmentKey in ('BD6187C8-0A2F-4D0C-8F64-B47900EF4407',
'129248E5-074E-409C-96D0-B47900EF5D5A',
'A6C39484-5F66-400F-A5ED-B47900EF7AAF',
'663BEBF0-BD84-4C02-84F1-B47900EF9A03')

delete from ProgramEnrollmentModule.SynchronizationRecord
where ProgramEnrollmentKey in ('BD6187C8-0A2F-4D0C-8F64-B47900EF4407',
'129248E5-074E-409C-96D0-B47900EF5D5A',
'A6C39484-5F66-400F-A5ED-B47900EF7AAF',
'663BEBF0-BD84-4C02-84F1-B47900EF9A03')

delete from ProgramEnrollmentModule.ProgramEnrollmentSuspension
where ProgramEnrollmentKey in ('BD6187C8-0A2F-4D0C-8F64-B47900EF4407',
'129248E5-074E-409C-96D0-B47900EF5D5A',
'A6C39484-5F66-400F-A5ED-B47900EF7AAF',
'663BEBF0-BD84-4C02-84F1-B47900EF9A03')

Select ProgramEnrollmentExtensionKey from CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
where ProgramEnrollmentKey in ('BD6187C8-0A2F-4D0C-8F64-B47900EF4407',
'129248E5-074E-409C-96D0-B47900EF5D5A',
'A6C39484-5F66-400F-A5ED-B47900EF7AAF',
'663BEBF0-BD84-4C02-84F1-B47900EF9A03')


delete from CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
where ProgramEnrollmentKey in ('BD6187C8-0A2F-4D0C-8F64-B47900EF4407',
'129248E5-074E-409C-96D0-B47900EF5D5A',
'A6C39484-5F66-400F-A5ED-B47900EF7AAF',
'663BEBF0-BD84-4C02-84F1-B47900EF9A03')

delete from CustomerProgramEnrollmentModule.SuccessTransaction
where CaseKey = 'AA8A3290-0F50-4D45-9C52-B4670130AFD4'

delete from CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
where ProgramEnrollmentExtensionKey in ('7CBC3E7A-8A4B-4F36-AA94-B47900EF4461',
'C6A02477-E730-4554-A6B6-B47900EF9A10')

delete from CustomerProgramEnrollmentModule.SyncTransaction
where ProgramEnrollmentExtensionKey in ('7CBC3E7A-8A4B-4F36-AA94-B47900EF4461',
'C6A02477-E730-4554-A6B6-B47900EF9A10')

Select SyncTransactionKey from CustomerProgramEnrollmentModule.SyncTransaction
where ProgramEnrollmentExtensionKey in ('7CBC3E7A-8A4B-4F36-AA94-B47900EF4461',
'C6A02477-E730-4554-A6B6-B47900EF9A10')

delete from CustomerProgramEnrollmentModule.SyncTransactionMessages
where SyncTransactionKey in ('9A7B6B32-95A4-4884-9D21-B47900F033EC',
'DF8BC145-4739-4C8C-88BD-B47900EFA2D1')

----END