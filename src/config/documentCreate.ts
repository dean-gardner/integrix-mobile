export enum DocumentTaskReferencing {
  WorkOrderAndNotificationNo = 0,
  ProjectNumber = 1,
  NoTaskNumber = 2,
}

export type TaskReferencingOption = {
  value: DocumentTaskReferencing;
  label: string;
  tooltip: string;
};

export const taskReferencingOptions: TaskReferencingOption[] = [
  {
    value: DocumentTaskReferencing.WorkOrderAndNotificationNo,
    label: 'Work Order and Notification Number',
    tooltip:
      'Select this option when this document will be used in conjunction with a Work order and/or Notification number.',
  },
  {
    value: DocumentTaskReferencing.ProjectNumber,
    label:
      'Project Number',
    tooltip:
      'Select this option if the work belongs to a project with a unique number system. Typically these documents are only utilised once to complete a finite campaign of work.',
  },
  {
    value: DocumentTaskReferencing.NoTaskNumber,
    label:
      'User does not need to specify task number',
    tooltip:
      'Select this option if the document will not be used under a maintenance or project activity and therefore there is no existing numbering system in place.',
  },
];
