// Lead intake for kassova.com (docs/adr/0001-astro-site-and-lead-intake.md).
//
// A Consumption Logic App with an HTTP request trigger receives the site's forms, validates them and creates a lead in
// Dataverse (D365) through the Web API, signed in as a user-assigned managed identity. There is no managed API
// connection and no stored secret: the identity is the connection, and Dataverse grants it one narrow security role
// (infra/lead-intake/dataverse/definition.json).
//
// Deployed by the intake:deploy CI job into the resource group named by KASSOVA_INTAKE_RESOURCE_GROUP.

targetScope = 'resourceGroup'

@description('Azure region; defaults to the resource group location.')
param location string = resourceGroup().location

@description('The site the browser is redirected back to after a submission.')
param siteOrigin string = 'https://kassova.com'

@description('The Dataverse environment that receives leads (Dream Dataverse).')
param dataverseUrl string = 'https://dream.crm.dynamics.com'

@description('Stem for resource names.')
param namePrefix string = 'kassova-web-intake'

@description('Most leads accepted per email address in one hour.')
@minValue(1)
param maxLeadsPerEmailPerHour int = 3

@description('Most leads accepted in total in one hour; beyond it visitors see a busy page.')
@minValue(1)
param maxLeadsPerHour int = 50

var tags = {
  product: 'kassova'
  component: 'website-lead-intake'
  'managed-by': 'kassova/website infra/lead-intake'
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${namePrefix}'
  location: location
  tags: tags
}

resource workflow 'Microsoft.Logic/workflows@2019-05-01' = {
  name: 'la-${namePrefix}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    state: 'Enabled'
    definition: loadJsonContent('workflow.json')
    parameters: {
      siteOrigin: { value: siteOrigin }
      dataverseUrl: { value: dataverseUrl }
      identityId: { value: identity.id }
      maxLeadsPerEmailPerHour: { value: maxLeadsPerEmailPerHour }
      maxLeadsPerHour: { value: maxLeadsPerHour }
    }
  }
}

@description('Application (client) id of the identity; the Dataverse applier registers it as an application user.')
output identityClientId string = identity.properties.clientId

@description('The workflow name; CI reads the trigger callback URL from it.')
output workflowName string = workflow.name
