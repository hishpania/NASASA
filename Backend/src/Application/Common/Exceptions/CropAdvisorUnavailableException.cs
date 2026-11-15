namespace Neosphere.Application.Common.Exceptions;

public class CropAdvisorUnavailableException(string message, Exception? innerException = null)
    : Exception(message, innerException);
