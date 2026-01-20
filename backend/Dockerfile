# Use an official OpenJDK runtime as a parent image
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace/app

# Copy the maven wrapper and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Fix windows line endings for mvnw if they exist
RUN sed -i 's/\r$//' mvnw
RUN chmod +x mvnw

# Download dependencies (this step is cached if pom.xml doesn't change)
RUN ./mvnw dependency:go-offline -B

# Copy the project source
COPY src src

# Package the application
RUN ./mvnw clean package -DskipTests
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)

# Production stage
FROM eclipse-temurin:17-jre-jammy
VOLUME /tmp
ARG DEPENDENCY=/workspace/app/target/dependency
# Copy the dependency and application classes
COPY --from=build ${DEPENDENCY}/BOOT-INF/lib /app/lib
COPY --from=build ${DEPENDENCY}/META-INF /app/META-INF
COPY --from=build ${DEPENDENCY}/BOOT-INF/classes /app

# Run the application
ENTRYPOINT ["java","-cp","app:app/lib/*","com.smartship.SmartshipApplication"]
