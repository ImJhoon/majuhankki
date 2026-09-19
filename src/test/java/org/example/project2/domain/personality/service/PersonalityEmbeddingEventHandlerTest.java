package org.example.project2.domain.personality.service;

import org.example.project2.domain.personality.entity.PersonalityQuestionnaireVersion;
import org.example.project2.domain.personality.entity.PersonalityTag;
import org.example.project2.domain.personality.entity.UserPersonalityEmbedding;
import org.example.project2.domain.personality.entity.UserPersonalityProfile;
import org.example.project2.domain.personality.repository.UserPersonalityEmbeddingRepository;
import org.example.project2.domain.personality.repository.UserPersonalityProfileRepository;
import org.example.project2.domain.personality.service.ai.PersonalityAiClient;
import org.example.project2.domain.personality.service.embedding.PersonalityEmbeddingDocument;
import org.example.project2.domain.personality.service.embedding.PersonalityTextEmbeddingDocumentBuilder;
import org.example.project2.domain.personality.service.embedding.PersonalityEmbeddingEventHandler;
import org.example.project2.domain.personality.service.embedding.PersonalityEmbeddingRequestedEvent;
import org.example.project2.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersonalityEmbeddingEventHandlerTest {
    @Mock UserPersonalityProfileRepository profileRepository;
    @Mock UserPersonalityEmbeddingRepository embeddingRepository;
    @Mock
    PersonalityAiClient aiClient;

    @Test
    void savesVersioned1536DimensionEmbedding() {
        UUID userId = UUID.randomUUID();
        UserPersonalityProfile profile = profile(userId, true, "새로운 맛집을 좋아해요.");
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(aiClient.embed(any())).thenReturn(Optional.of(new float[1536]));
        when(aiClient.embeddingModelName()).thenReturn("gemini-embedding-001");
        PersonalityEmbeddingEventHandler handler = new PersonalityEmbeddingEventHandler(
                profileRepository, embeddingRepository, new PersonalityTextEmbeddingDocumentBuilder(), aiClient
        );

        handler.generate(new PersonalityEmbeddingRequestedEvent(userId, profile.getSelfDescription()));

        verify(aiClient).embed("새로운 맛집을 좋아해요.");
        ArgumentCaptor<List<UserPersonalityEmbedding>> captor = ArgumentCaptor.forClass(List.class);
        verify(embeddingRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).singleElement().satisfies(embedding -> {
            assertThat(embedding.getProfile()).isSameAs(profile);
            assertThat(embedding.getSourceText()).isEqualTo(profile.getSelfDescription());
            assertThat(embedding.getEmbedding()).hasSize(1536);
            assertThat(embedding.getModelName()).isEqualTo("gemini-embedding-001");
            assertThat(embedding.getSourceVersion()).isEqualTo(PersonalityTextEmbeddingDocumentBuilder.DOCUMENT_VERSION);
            assertThat(embedding.getGeneratedAt()).isNotNull();
        });
    }

    @Test
    void savesOneEmbeddingPerExtractedKeywordAndPreservesStyleTags() {
        UUID userId = UUID.randomUUID();
        UserPersonalityProfile profile = profile(userId, true, "대화와 맛집을 좋아해요.");
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(aiClient.extractKeywords(profile.getSelfDescription()))
                .thenReturn(Optional.of(List.of("대화", "맛집")));
        float[] conversationVector = new float[1536];
        conversationVector[0] = 1;
        float[] restaurantVector = new float[1536];
        restaurantVector[1] = 1;
        when(aiClient.embed("대화")).thenReturn(Optional.of(conversationVector));
        when(aiClient.embed("맛집")).thenReturn(Optional.of(restaurantVector));
        when(aiClient.embeddingModelName()).thenReturn("test-model");
        PersonalityEmbeddingEventHandler handler = new PersonalityEmbeddingEventHandler(
                profileRepository, embeddingRepository, new PersonalityTextEmbeddingDocumentBuilder(), aiClient
        );

        handler.generate(new PersonalityEmbeddingRequestedEvent(userId, profile.getSelfDescription()));

        ArgumentCaptor<List<UserPersonalityEmbedding>> captor = ArgumentCaptor.forClass(List.class);
        verify(embeddingRepository).deleteAllByProfileUserId(userId);
        verify(embeddingRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).extracting(UserPersonalityEmbedding::getSourceText)
                .containsExactly("대화", "맛집");
        assertThat(captor.getValue().get(0).getEmbedding()).containsExactly(conversationVector);
        assertThat(captor.getValue().get(1).getEmbedding()).containsExactly(restaurantVector);
        assertThat(profile.getAiKeywords()).containsExactlyInAnyOrder("대화", "맛집");
        assertThat(profile.getStyleTags()).containsExactly(PersonalityTag.GOOD_LISTENER);
        verify(aiClient, never()).embed(profile.getSelfDescription());
    }

    @Test
    void ignoresAiFailureAndDoesNotSaveEmbedding() {
        UUID userId = UUID.randomUUID();
        when(profileRepository.findByUserId(userId))
                .thenReturn(Optional.of(profile(userId, true, "소개")));
        when(aiClient.embed(any())).thenReturn(Optional.empty());
        PersonalityEmbeddingEventHandler handler = new PersonalityEmbeddingEventHandler(
                profileRepository, embeddingRepository, new PersonalityTextEmbeddingDocumentBuilder(), aiClient
        );

        handler.generate(new PersonalityEmbeddingRequestedEvent(userId, "소개"));

        verify(embeddingRepository, never()).saveAll(any());
    }

    @Test
    void ignoresEventWhenProfileTextChangedBeforeEmbedding() {
        UUID userId = UUID.randomUUID();
        UserPersonalityProfile profile = profile(userId, true, "새로운 소개");
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        PersonalityEmbeddingEventHandler handler = new PersonalityEmbeddingEventHandler(
                profileRepository, embeddingRepository, new PersonalityTextEmbeddingDocumentBuilder(), aiClient
        );

        handler.generate(new PersonalityEmbeddingRequestedEvent(userId, "이전 소개"));

        verifyNoInteractions(aiClient);
        verify(embeddingRepository, never()).saveAll(any());
        verify(embeddingRepository, never()).deleteAllByProfileUserId(userId);
    }

    @Test
    void doesNotSaveEmbeddingWhenProfileChangesDuringAiCall() {
        UUID userId = UUID.randomUUID();
        UserPersonalityProfile oldProfile = profile(userId, true, "이전 소개");
        UserPersonalityProfile latestProfile = profile(userId, true, "새로운 소개");
        when(profileRepository.findByUserId(userId))
                .thenReturn(Optional.of(oldProfile), Optional.of(latestProfile));
        when(aiClient.extractKeywords("이전 소개")).thenReturn(Optional.of(List.of("대화")));
        PersonalityEmbeddingEventHandler handler = new PersonalityEmbeddingEventHandler(
                profileRepository, embeddingRepository, new PersonalityTextEmbeddingDocumentBuilder(), aiClient
        );

        handler.generate(new PersonalityEmbeddingRequestedEvent(userId, "이전 소개"));

        verify(embeddingRepository, never()).saveAll(any());
    }

    @Test
    void deletesEmbeddingWhenConsentOrDescriptionIsRemoved() {
        UUID userId = UUID.randomUUID();
        UserPersonalityProfile profile = profile(userId, false, null);
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        PersonalityEmbeddingEventHandler handler = new PersonalityEmbeddingEventHandler(
                profileRepository, embeddingRepository, new PersonalityTextEmbeddingDocumentBuilder(), aiClient
        );

        handler.generate(new PersonalityEmbeddingRequestedEvent(userId, "이전 소개"));

        verify(embeddingRepository).deleteAllByProfileUserId(userId);
        verifyNoInteractions(aiClient);
    }

    @Test
    void deletesEmbeddingWhenDescriptionIsClearedWhileConsentRemains() {
        UUID userId = UUID.randomUUID();
        UserPersonalityProfile profile = profile(userId, true, null);
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        PersonalityEmbeddingEventHandler handler = new PersonalityEmbeddingEventHandler(
                profileRepository, embeddingRepository, new PersonalityTextEmbeddingDocumentBuilder(), aiClient
        );

        handler.generate(new PersonalityEmbeddingRequestedEvent(userId, "기존 소개"));

        verify(embeddingRepository).deleteAllByProfileUserId(userId);
        verifyNoInteractions(aiClient);
    }

    @Test
    void doesNotSaveInvalidDimensionFromAi() {
        UUID userId = UUID.randomUUID();
        UserPersonalityProfile profile = profile(userId, true, "소개");
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(aiClient.embed("소개")).thenReturn(Optional.of(new float[2]));
        PersonalityEmbeddingEventHandler handler = new PersonalityEmbeddingEventHandler(
                profileRepository, embeddingRepository, new PersonalityTextEmbeddingDocumentBuilder(), aiClient
        );

        handler.generate(new PersonalityEmbeddingRequestedEvent(userId, "소개"));

        verify(embeddingRepository, never()).saveAll(any());
    }

    @Test
    void documentIsDeterministicAndVersioned() {
        PersonalityTextEmbeddingDocumentBuilder builder = new PersonalityTextEmbeddingDocumentBuilder();
        UserPersonalityProfile profile = profile(UUID.randomUUID(), true, "소개");

        PersonalityEmbeddingDocument first = builder.build(profile.getSelfDescription());
        PersonalityEmbeddingDocument second = builder.build(profile.getSelfDescription());

        assertThat(first).isEqualTo(second);
        assertThat(first.sourceVersion()).isEqualTo("PERSONALITY_FREE_TEXT_V2");
        assertThat(first.sourceText()).isEqualTo("소개");
        assertThat(first.sourceText())
                .doesNotContain("conversationLevel", "mealPace", "planningStyle", "noveltyPreference", "GOOD_LISTENER");
    }

    @Test
    void normalizesTextWithTheSharedPolicy() {
        PersonalityTextEmbeddingDocumentBuilder builder = new PersonalityTextEmbeddingDocumentBuilder();

        PersonalityEmbeddingDocument document = builder.build("  편안하게 대화하는 분  ");

        assertThat(document.sourceText()).isEqualTo("편안하게 대화하는 분");
        assertThat(document.sourceVersion()).isEqualTo("PERSONALITY_FREE_TEXT_V2");
    }

    private UserPersonalityProfile profile(UUID userId, boolean consent, String description) {
        User user = User.builder().id(userId).email("user@test.com")
                .passwordHash("hash").nickname("user").build();
        return UserPersonalityProfile.builder()
                .user(user)
                .questionnaireVersion(PersonalityQuestionnaireVersion.MEAL_PERSONALITY_V1)
                .conversationLevel((short) 50)
                .mealPace((short) 50)
                .planningStyle((short) 50)
                .noveltyPreference((short) 50)
                .styleTags(new HashSet<>(Set.of(PersonalityTag.GOOD_LISTENER)))
                .selfDescription(description)
                .aiAnalysisConsent(consent)
                .build();
    }
}
