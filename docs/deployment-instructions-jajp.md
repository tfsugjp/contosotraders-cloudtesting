# Contoso Traders - Deployment instructions

このドキュメントは、Azure 環境に Contoso Traders アプリケーションをデプロイする方法について説明します。GitHub Actions と Azure CLI の両方を使用します。

一度デプロイすると、Microsoft Playwright、Azure Load Testing、Azure Chaos Studio のさまざまなデモ シナリオを実行できます。

訳注：足りないところを補足しています。Windowsの場合、以下の手順はWSL2を使うことを推奨します。

## Prerequisites

You will need following to get started:

1. **GitHub account**: Create a free account [here](https://github.com/).
2. **Azure subscription**: Create a free account [here](https://azure.microsoft.com/free/).
3. **Azure CLI**: Instructions to download and install [here](https://learn.microsoft.com/cli/azure/install-azure-cli).
4. **VS Code**: Download and install [here](https://code.visualstudio.com/download).

## Prepare your Azure Subscription

1. Azure CLIを使って、`az login` で Azure にログインします。

2. 次のコマンドを使ってAzure Subscriptionを選択してください: `az account show`
   * 使うサブスクリプションと異なる場合、`az account set -s <AZURE-SUBSCRIPTION-ID>`と指定します。 `<AZURE-SUBSCRIPTION-ID>` を自分が使うAzure SubscriptionのIDに置き換えてください。

3. Azure subscriptionに以下のリソースプロバイダーを登録してください(訳注：後半3つは新規のサブスクリプションだと登録していない場合があります)
   * `az provider register -n Microsoft.OperationsManagement -c`
   * `az provider register -n Microsoft.Cdn -c`
   * `az provider register -n Microsoft.Chaos -c`
   * `az provider register -n Microsoft.ContainerService -c`
   * `az provider register -n Microsoft.App -c`
   * `az provider register -n Microsoft.Batch -c`

4. Azure Service Principalを作成し、サブスクリプションの`Owner`ロールを適用します。以下のコマンドを実行してください。`<AZURE-SUBSCRIPTION-ID>` を自分が使うAzure SubscriptionのIDに置き換えてください。
   * `az ad sp create-for-rbac -n contosotraders-sp --role Owner --scopes /subscriptions/<AZURE-SUBSCRIPTION-ID> --sdk-auth`。
   * 上記の手順を実行するとJSONが出力されます (`clientId`, `clientSecret`, `subscriptionId`, `tenantId` プロパティが含まれます). すべて後の手順で使います。
   * '--sdk-auth' オプションを指定すると、「将来のリリースで廃止されます」という傾向が出ます。[a known issue, without workarounds, but can be safely ignored](https://github.com/Azure/azure-cli/issues/20743)をみてください.

5. 何らかの理由でサブスクリプションへの`owner`権限をservice principalに指定できない場合、カスタムロールを作成して、service principalに指定してください (`<AZURE-SUBSCRIPTION-ID>`を対象のサブスクリプションで置換します).

   1. bashで実行する場合、以下のコマンドを実行してください（訳注:Windowsの場合WSL2を使ってください）。

      ```bash
      az role definition create --role-definition '{
          "Name": "ContosoTraders Write Role Assignments",
          "Description": "Perform Role Assignments",
          "Actions": ["Microsoft.Authorization/roleAssignments/write"],
          "AssignableScopes": ["/subscriptions/<AZURE-SUBSCRIPTION-ID>"]
      }'
      ```

   2. PowerShellもしくはcmdを使う場合、custom-role.jsonというファイルを作成して、以下の内容を記載し、`az role definition create --role-definition ./custom-role.json`を実行してください。

      ```json
      {
          "Name": "ContosoTraders Write Role Assignments",
          "Description": "Perform Role Assignments",
          "Actions": ["Microsoft.Authorization/roleAssignments/write"],
          "AssignableScopes": ["/subscriptions/<AZURE-SUBSCRIPTION-ID>"]
      }
      ```

   3. 最後にカスタムロールをservice principalに割り当てます。

      ```bash
      `az ad sp create-for-rbac -n contosotraders-sp --role "ContosoTraders Write Role Assignments" --scopes /subscriptions/<AZURE-SUBSCRIPTION-ID> --sdk-auth`
      ```

6. サブスクリプションにAzure Cognitive Servicesをデプロイしたことがない場合、responsible AI termsに同意する必要があります。デプロイ対象のサブスクリプションに対して、手動で一時的にAzure Cognitive Serviceリソースを作成し、 Responsible AI termsに同意しなければなりません。その後削除可能です。

   * Responsible AI termsはサブスクリプションごとに一度だけ同意してください。一度同意すれば、再度同意する必要はありません。
   * 現時点では、Responsible AI termsを機械的に同意することはできません。必ずAzure Portalから手動で実施してください。
   * 詳細は[この](https://learn.microsoft.com/azure/machine-learning/concept-responsible-ai)Responsible AIを読んでください。

   ![agree-cognitive-service-screenshot](./images/agree-cognitive-service-screenshot.png)

## Prepare your GitHub Repository

1. この[contosotraders-cloudtesting repo](https://github.com/microsoft/contosotraders-cloudtesting)をあなたのアカウントにforkしてください。

訳注：Azure Reposへのimportでも大丈夫です。

## Prepare your GitHub Workflow for Deployment

>
>もしも、GitHub Actionsの代わりにAzure Pipelinesを使う場合、[ここ](./deployment-instructions-azure-pipelines-jajp.md)のエントリーを読んでください。
>

1. フォークしたレポジトリにrepository secretsを登録します。 `Settings` tab > `Secrets and variables` > `Actions` > `Secrets`に以下のシークレット値が登録されていなくてはなりません。

    | Secret Name        | Secret Value                                                                       |
    | ------------------ | ---------------------------------------------------------------------------------- |
    | `SQLPASSWORD`      | 8 から 15 文字（シングルバイト）かつ、大文字,小文字,数字を含まなくてはなりません |
    | `SERVICEPRINCIPAL` | 以下のフォーマットで指定します                                                        |

    必ず`SERVICEPRINCIPAL`という名前で、以下のフォーマットに従ったシークレットを作成してください。

   ```json
   {
     "clientId": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
     "clientSecret": "your-client-secret",
     "tenantId": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
     "subscriptionId": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"
   }
   ```

    前のセクションで実行した`az ad sp create-for-rbac`コマンドのJSON出力に含まれるプロパティの値を使ってください。

2. フォーク下GitHubのレポジトリのvariablesに以下の値を指定します。`Settings`タブ > `Secrets and variables` > `Actions` > `Variables` に以下の値を作成してください。

    | Variable Name      | Variable Value                                                                                                                                                                              |
    | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `SUFFIX`           | Azureで一位にならなければならないリソースの前置詞を指定します (最大6文字, 小文字アルファベット,数字のみ。特殊文字、空白を含んではなりません). 例えば、'test51' や '1stg' です。                                                    |
    | `DEPLOYMENTREGION` | 次のうちのいずれかのAzureリージョン以外は指定できません。 `australiaeast`,`centralus`,`eastus`,`eastus2`,`japaneast`,`northcentralus`,`uksouth`,`westcentralus`,`westeurope` |

3. (任意)もしも、プライベートエンドポイントのテストをしたい場合、variableに以下の値を設定してください。

    | Variable Name      | Variable Value                                                                                                                                                                              |
    | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `DEPLOYPRIVATEENDPOINTS`           | `true`


### Deploy the Application

1. フォークしたレポジトリの`Actions`タブで`contoso-traders-cloud-testing`workflowを選択し、`Run workflow`ボタンを押してください。

2. このGitHub workflowはあなたのAzureサブスクリプションに必要なインフラストラクチャとアプリケーション（API, UI）を構築します。完了するまで少なくとも15分必要です。

  ![workflow-logs](./images/github-workflow.png)

### Verify the Deployment

1. workflowが完了したら、UIからGitHub workflow実行中に表示されたCDNエンドポイントのURLにアクセスできるようになります。

    ![Endpoints in workflow logs](./images/ui-endpoint-github-workflow.png)

2. 上記のURLをクリックすると、新しいブラウザータブにアプリケーションがロードされます。アプリケーションが実行できているか確認してください。

### Troubleshooting Deployment Errors

デプロイ時に発生する一般的な問題は以下の通りです。

1. Intermittent errors: GitHub workflowで[these intermittent errors](https://github.com/microsoft/ContosoTraders/issues?q=is%3Aissue+is%3Aopen+label%3Adevops) というエラーが出ることがあります。その場合、失敗したジョブを再実行してください（再実行すると成功します）。この問題は近々修正される予定です。

2. `clientSecret`の先頭文字が`-` (ハイフン)である場合、github actionのAzure loginが失敗する[known issue](https://github.com/Azure/login/issues/249)があります。この場合、新しいシークレットを生成し、github forkのrepository secretを更新して、ワークフローを再開してください。

## Explore Demo Scenarios

For further learning, you can run through some of the demo scripts listed below:

* [Developer workflow](../demo-scripts/dev-workflow/walkthrough.md)
* [Azure Load Testing](../demo-scripts/azure-load-testing/walkthrough.md)
* [Azure Chaos Studio](../demo-scripts/azure-chaos-studio/walkthrough.md)
* [UI Testing with Playwright](../demo-scripts/testing-with-playwright/walkthrough.md)

## Cleanup

デプロイ完了, テスト,参照が終わったら`contoso-traders-rg{SUFFIX}`という名前のリソースグループを削除すれば、それ以上コストは発生しません。

訳注:Load Testingのみ残しておけば、いつでもテスト結果のみ参照可能です

  ![resource group deletion](./images/resource-group-deletion.png)

`contoso-traders-aks-nodes-rg{SUFFIX}` リソースグループはAKSクラスター削除時に自動的に削除されます。

## Cost Considerations

Azureサブスクリプションにデプロイするときのコスト考慮事項における注意点です。

1. Azure Load Testing([pricing details](https://azure.microsoft.com/pricing/details/load-testing/)):virtual usersとdurationがコストの重要な要因となります。このデモでは、5 virtual usersが3分間アクセスする設定にしています。

2. Azure Kubernetes Service ([pricing details](https://azure.microsoft.com/pricing/details/kubernetes-service/)):node数とクラスターにおけるノードの実行時間はクラスターコストの重要な要因です。このデモではクラスターは1ノード（VM Scale set）が24時間ずっと稼働するように設定されています（不要な時はクラスターを手動で停止してください）。これは現在の[AKS bicepにおける制限事項](https://github.com/Azure/bicep/issues/6974)で、AKSクラスターはPremium SSDストレージを使っています。

3. Azure Container Apps ([pricing details](https://azure.microsoft.com/pricing/details/container-apps/)):どのインスタンスも0.5 vCPUと1.0 GiBメモリを使っています。このデモではコンテナーアプリケーションは1インスタンスに設定していますが、autoscaleで最大3インスタンスまで増加します。

4. Azure Virtual Machines ([pricing details](https://azure.microsoft.com/pricing/details/virtual-machines/windows/)):踏み台用のVMは`Standard_D2s_v3`で構成されており、2 vCPUと 8GiBメモリーを使います。踏み台VMはUTCの19:00（日本時間では朝4:00）に自動停止します。不要な時は手動で停止、解放してください。

5. Github Actions / storage quota ([pricing details](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions#included-storage-and-minutes)):playwrite テストは失敗した実行のみ記録するように設定しています。これは失敗ごとに55MB未満のデータを保存しています。

> 上記のコストはデフォルトのでも構成です。変更することでコストを削減することが可能です。例えば、container appsのインスタンスを減らすとか、実行時のVirtual userを減らすなどの工夫が可能です。