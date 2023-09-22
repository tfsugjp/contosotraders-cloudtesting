# Contoso Traders - Deployment instructions using Azure Pipelines

このドキュメントは、Azure Pipelines を使用して Contoso Traders アプリケーションを Azure 環境にデプロイする方法について説明します。

## Prerequisites

1. You'll have to follow the steps in the [Deployment Instructions](./deployment-instructions.md) document to set up your Azure subscription and github repository fork.
2. Azure DevOps organizationとプロジェクトをセットアップしてください. もっていない場合、[ここ](https://docs.microsoft.com/en-us/azure/devops/organizations/projects/create-project?view=azure-devops&tabs=preview-page)手順に従って開始してください。
3. Azure DevOps marketplaceから以下の拡張機能をorganizationへインストールしてください

   - [Azure Load Testing](https://marketplace.visualstudio.com/items?itemName=AzloadTest.AzloadTesting)
   - [Replace Tokens](https://marketplace.visualstudio.com/items?itemName=qetza.replacetokens)

訳注：Azure Pipelinesの無料枠は申請式で、1-2営業日必要です。申請は[こちら](https://aka.ms/azpipelines-parallelism-request)から。

## Prepare your Azure Pipeline for Deployment

1. Ensure that you [provide access](https://github.com/settings/connections/applications/0d4949be3b947c3ce4a5) to the Azure Devops application in your GitHub account. Specifically ensure that the application has access to your forked GitHub repository.

2. 新しいAzure PipelineをAzure DevOps projectに作成します。`Pipelines` > `New pipeline` > `GitHub` > フォークされたGitHubレポジトリを選びます。 `Existing Azure Pipelines YAML file` > `contoso-traders-cloud-testing/azure-pipelines.yml` (ensure branch is `main`, path is `/.azurepipelines/azure-pipelines.yml`) > `Continue`.

訳注：[GitHubからforkしたレポジトリに対するビルドの仕様変更](https://learn.microsoft.com/en-us/azure/devops/release-notes/2023/sprint-227-update#build-github-repositories-securely-by-default)が入っています。注意してください。

3. Set up a service connection to Azure: In your Azure DevOps project, click on `Project settings` (bottom left of page) > `Service Connections` > `New service connection` > `Azure Resource Manager` > `Service principal (manual)` > `Next`.

    At this point, you'll need the JSON output from the `az ad sp create-for-rbac` command [executed earlier](./deployment-instructions.md#prepare-your-azure-subscription).

   ```json
   {
     "clientId": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
     "clientSecret": "your-client-secret",
     "tenantId": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
     "subscriptionId": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"
   }
   ```

   `New Azure Service Connection`ページで以下の情報を入力してください。ｇ

   - **Environment**: `Azure Cloud`
   - **Scope Level**: `Subscription`
   - **Subscription Id**: `subscriptionId` property from the JSON output
   - **Subscription Name**: The name of your Azure subscription
   - **Service Principal Id**: `clientId` property from the JSON output
   - **Credential**: Choose the `Service principal key` option
   - **Service Principal Key**: `clientSecret` property from the JSON output
   - **Tenant ID**: `tenantId` property from the JSON output
   - **Service Connection Name**: `SERVICEPRINCIPAL` (please use this exact name)
   - **Description**: `Service connection to Azure subscription using service principal`
   - **Grant access permission to all pipelines**: Ensure this option is checked

   Click the `Verify and save` button.

4. Set up the variables for your Azure Pipeline. Click on `Pipelines` > `Library` > `+ Variable Group`. Create a variable group called `contosotraders-cloudtesting-variable-group` with the following variables:

    | Variable Name      | Variable Value                                                                                                                                                                              | Is Secret? |
    | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
    | `SQLPASSWORD`      | 8 から 15 文字（シングルバイト）かつ、大文字,小文字,数字を含まなくてはなりません                                          | YES        |
    | `SUFFIX`           | Azureで一位にならなければならないリソースの前置詞を指定します (最大6文字, 小文字アルファベット,数字のみ。特殊文字、空白を含んではなりません). 例えば、'test51' や '1stg' です。                                                      | NO         |
    | `DEPLOYMENTREGION` | 次のうちのいずれかのAzureリージョン以外は指定できません。`australiaeast`,`centralus`,`eastus`,`eastus2`,`japaneast`,`northcentralus`,`uksouth`,`westcentralus`,`westeurope` | NO         |

   After saving the variable group, click on `Pipeline permissions` and ensure that the `azure-pipelines.yml` pipeline has access to the variable group.

### Deploy the Application

1. Go to your Azure Project's `Pipelines` tab, select the `contoso-traders-cloud-testing` pipeline, and click on the `Run Pipeline` button.

2. The Azure pipeline will provision the necessary infrastructure to your Azure subscription as well as deploy the applications (APIs, UI) to the infrastructure. Note that the pipeline might take about 15 mins to complete.

  ![workflow-logs](./images/github-workflow.png)

>You may get an error if you do not have free parallel jobs available in your Azure DevOps organization. If you get this error, you'll have to [request for more parallel jobs](https://docs.microsoft.com/en-us/azure/devops/pipelines/licensing/concurrent-jobs?view=azure-devops&tabs=yaml) in your Azure DevOps organization.
>
>For any other deployment errors, please check the [Troubleshooting Deployment Errors section](./deployment-instructions-jajp.md#troubleshooting-deployment-errors) in the Deployment Instruction document.

## Next Steps

You can now proceed to [exploring demo scenarios](./deployment-instructions.md#explore-demo-scenarios).
