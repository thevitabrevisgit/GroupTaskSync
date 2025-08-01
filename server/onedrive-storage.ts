import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

export interface OneDriveConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  accounts: Array<{
    name: string;
    refreshToken: string;
    userId: string;
  }>;
}

export class OneDriveStorageManager {
  private config: OneDriveConfig;
  private currentAccountIndex = 0;

  constructor(config: OneDriveConfig) {
    this.config = config;
  }

  private async getAccessToken(accountIndex: number): Promise<string> {
    const account = this.config.accounts[accountIndex];
    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access'
    });

    try {
      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return response.data.access_token;
    } catch (error) {
      console.error(`Failed to get access token for account ${account.name}:`, error);
      throw new Error(`Authentication failed for OneDrive account ${account.name}`);
    }
  }

  private getNextAccount(): number {
    // Round-robin distribution across accounts
    const accountIndex = this.currentAccountIndex;
    this.currentAccountIndex = (this.currentAccountIndex + 1) % this.config.accounts.length;
    return accountIndex;
  }

  async uploadImage(
    fileBuffer: Buffer, 
    filename: string, 
    mimeType: string
  ): Promise<{ url: string, accountUsed: string }> {
    const accountIndex = this.getNextAccount();
    const account = this.config.accounts[accountIndex];
    
    try {
      const accessToken = await this.getAccessToken(accountIndex);
      
      // Create folder structure: /TaskShare/images/
      await this.ensureFolderExists(accessToken, 'TaskShare');
      await this.ensureFolderExists(accessToken, 'TaskShare/images');
      
      // Upload file to OneDrive
      const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/TaskShare/images/${filename}:/content`;
      
      const uploadResponse = await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': mimeType,
        }
      });

      // Store the item ID and account info for proxy access
      const itemId = uploadResponse.data.id;
      const proxyUrl = `/api/onedrive/image/${accountIndex}/${itemId}`;

      console.log(`📸 Image uploaded to OneDrive account: ${account.name}`);
      console.log(`📸 Item ID: ${itemId}`);
      console.log(`📸 Proxy URL: ${proxyUrl}`);
      
      return {
        url: proxyUrl,
        accountUsed: account.name,
        itemId: itemId,
        accountIndex: accountIndex
      };
    } catch (error) {
      console.error(`Upload failed for account ${account.name}:`, error);
      
      // Try next account if current one fails
      if (accountIndex < this.config.accounts.length - 1) {
        console.log(`Retrying with next OneDrive account...`);
        return this.uploadImage(fileBuffer, filename, mimeType);
      }
      
      throw new Error(`All OneDrive accounts failed to upload image`);
    }
  }

  private async ensureFolderExists(accessToken: string, folderPath: string): Promise<void> {
    try {
      // Check if folder exists
      await axios.get(`https://graph.microsoft.com/v1.0/me/drive/root:/${folderPath}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    } catch (error) {
      // Folder doesn't exist, create it
      const pathParts = folderPath.split('/');
      const parentPath = pathParts.slice(0, -1).join('/');
      const folderName = pathParts[pathParts.length - 1];
      
      const createUrl = parentPath 
        ? `https://graph.microsoft.com/v1.0/me/drive/root:/${parentPath}:/children`
        : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

      await axios.post(createUrl, {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'replace'
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    }
  }

  async downloadImage(accountIndex: number, itemId: string): Promise<Buffer> {
    const accessToken = await this.getAccessToken(accountIndex);
    const downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`;
    
    const response = await axios.get(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  async getStorageInfo(): Promise<Array<{ account: string, used: string, total: string }>> {
    const storageInfo = [];
    
    for (let i = 0; i < this.config.accounts.length; i++) {
      try {
        const accessToken = await this.getAccessToken(i);
        const response = await axios.get('https://graph.microsoft.com/v1.0/me/drive', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const quota = response.data.quota;
        storageInfo.push({
          account: this.config.accounts[i].name,
          used: this.formatBytes(quota.used),
          total: this.formatBytes(quota.total)
        });
      } catch (error) {
        storageInfo.push({
          account: this.config.accounts[i].name,
          used: 'Error',
          total: 'Error'
        });
      }
    }
    
    return storageInfo;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}