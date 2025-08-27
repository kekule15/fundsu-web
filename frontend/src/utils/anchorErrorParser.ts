// utils/anchorErrorParser.ts
import { AnchorError, Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";

export interface CustomAnchorError {
  code?: any;
  name: string;
  msg?: string;
}

export const parseAnchorError = (error: any, idl: anchor.Idl): CustomAnchorError | null => {
  // Check if it's an AnchorError
  if (error instanceof AnchorError) {
    const errorCode = error.error.errorCode;
    const errorName = Object.keys(error.error.errorCode)[0];
    
    // Find the error in the IDL
    const errorDefinition = idl.errors?.find(
      (err: any) => err.code === errorCode.code
    );
    
    if (errorDefinition) {
      return {
        code: errorDefinition.code,
        name: errorDefinition.name,
        msg: errorDefinition.msg,
      };
    }
    
    return {
      code: errorCode.code,
      name: errorName,
      msg: error.error.errorMessage || "Unknown Anchor error",
    };
  }

  // Check error logs for custom error messages
  if (error.logs && Array.isArray(error.logs)) {
    const logs = error.logs.join(" ");
    
    // Check for specific error patterns in logs
    const errorMatch = logs.match(/AnchorError occurred\. Error Code: (\w+)\. Error Number: (\d+)\. Error Message: ([^\.]+)/);
    
    if (errorMatch) {
      const [, errorName, errorCode, errorMsg] = errorMatch;
      
      // Try to find in IDL
      const errorDefinition = idl.errors?.find(
        (err: any) => err.code === parseInt(errorCode) || err.name === errorName
      );
      
      if (errorDefinition) {
        return {
          code: errorDefinition.code,
          name: errorDefinition.name,
          msg: errorDefinition.msg,
        };
      }
      
      return {
        code: parseInt(errorCode),
        name: errorName,
        msg: errorMsg,
      };
    }

    // Check for other common error patterns
    for (const errorDef of idl.errors || []) {
      if (logs.includes(errorDef.name) || logs.includes(errorDef.msg)) {
        return errorDef;
      }
    }
  }

  // Check for string-based errors
  const errorString = error.toString();
  for (const errorDef of idl.errors || []) {
    if (errorString.includes(errorDef.name) || errorString.includes(errorDef.msg)) {
      return errorDef;
    }
  }

  return null;
};

export const getHumanReadableError = (error: any, idl: anchor.Idl): string => {
  const parsedError = parseAnchorError(error, idl);
  
  if (parsedError) {
    return parsedError.msg || "Unknown error occurred";
  }

  // Handle common Solana/Anchor errors
  const errorMsg = error.toString();
  
  if (errorMsg.includes("already in use")) {
    return "Campaign with this title already exists. Please choose a different title.";
  }
  
  if (errorMsg.includes("Blockhash not found")) {
    return "Transaction timed out. Please try again.";
  }
  
  if (errorMsg.includes("User rejected")) {
    return "Transaction was cancelled by user.";
  }
  
  if (errorMsg.includes("Insufficient funds")) {
    return "Insufficient SOL balance for transaction fee.";
  }
  
  if (errorMsg.includes("DeclaredProgramIdMismatch")) {
    return "Program configuration error. Please contact support.";
  }

  // Default error message
  return "An unexpected error occurred. Please try again.";
};



// Enhanced error parser with specific checks
export const getCampaignSpecificError = (error: any, idl: anchor.Idl): string => {
  const parsedError = parseAnchorError(error, idl);
  
  if (parsedError) {
    // Handle specific campaign-related errors
    switch (parsedError.name) {
      case "InvalidTitleLength":
        return "Title is too long. Please use a shorter title.";
      case "InvalidDescriptionLength":
        return "Description is too long. Please shorten your description.";
      case "InvalidTargetAmount":
        return "Target amount must be greater than zero.";
      case "MathOverflow":
        return "Amount too large. Please use a smaller amount.";
      default:
        return parsedError.msg || "Unknown error occurred";
    }
  }

  // Handle account already in use (PDA collision)
  const errorString = error.toString();
  if (errorString.includes("already in use") || 
      errorString.includes("AccountAlreadyInitialized")) {
    return "A campaign with this title already exists. Please choose a different title.";
  }

  // Handle transaction-specific errors
  if (error.logs) {
    const logs = error.logs.join(" ");
    if (logs.includes("seed") && logs.includes("already")) {
      return "This campaign title is already taken. Please choose a different title.";
    }
  }

  return getHumanReadableError(error, idl);
};

